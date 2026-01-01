from flask import Flask, render_template, request, jsonify, send_from_directory
from adt import Playlist, Song
import os
import json
from werkzeug.utils import secure_filename
from mutagen.easyid3 import EasyID3
from mutagen.mp3 import MP3
from mutagen.id3 import ID3NoHeaderError
from datetime import datetime
import uuid


app = Flask(__name__)
app.config['UPLOAD_FOLDER'] = 'static/music'
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max limit
PLAYLISTS_FILE = 'playlists_data.json'

# Ensure upload directory exists
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

# Global playlists storage
playlists = {}
current_playlist_id = None

def save_playlists():
    """Save all playlists to JSON file"""
    playlists_data = {}
    for playlist_id, playlist_info in playlists.items():
        songs_data = []
        for song_dict in playlist_info['playlist'].get_all_songs():
            songs_data.append(song_dict)
        
        playlists_data[playlist_id] = {
            'name': playlist_info['name'],
            'description': playlist_info['description'],
            'created_at': playlist_info['created_at'],
            'songs': songs_data
        }
    
    data = {
        'playlists': playlists_data,
        'current_playlist_id': current_playlist_id
    }
    
    with open(PLAYLISTS_FILE, 'w') as f:
        json.dump(data, f, indent=2)

def load_playlists():
    """Load all playlists from JSON file"""
    global current_playlist_id
    
    if os.path.exists(PLAYLISTS_FILE):
        try:
            with open(PLAYLISTS_FILE, 'r') as f:
                data = json.load(f)
            
            playlists_data = data.get('playlists', {})
            current_playlist_id = data.get('current_playlist_id')
            
            for playlist_id, playlist_data in playlists_data.items():
                playlist = Playlist()
                
                for song_data in playlist_data.get('songs', []):
                    song = Song(song_data['title'], song_data['artist'], song_data['file_path'])
                    song.id = song_data['id']
                    song.added_at = datetime.fromisoformat(song_data['added_at'])
                    song.is_favorite = song_data.get('is_favorite', False)
                    song.play_count = song_data.get('play_count', 0)
                    if song_data.get('last_played'):
                        song.last_played = datetime.fromisoformat(song_data['last_played'])
                    playlist.add_song(song)
                
                playlists[playlist_id] = {
                    'name': playlist_data['name'],
                    'description': playlist_data['description'],
                    'created_at': playlist_data['created_at'],
                    'playlist': playlist
                }
        except Exception as e:
            print(f"Error loading playlists: {e}")
    
    # Create default playlist if none exist
    if not playlists:
        create_default_playlist()
    
    # Migrate old playlist data if it exists
    migrate_old_playlist_data()

def migrate_old_playlist_data():
    """Migrate songs from old playlist_data.json to Library playlist"""
    old_playlist_file = 'playlist_data.json'
    
    if os.path.exists(old_playlist_file):
        try:
            with open(old_playlist_file, 'r') as f:
                old_songs_data = json.load(f)
            
            if old_songs_data:  # If there are songs to migrate
                # Find or create Library playlist
                library_playlist_id = None
                for playlist_id, playlist_info in playlists.items():
                    if playlist_info['name'] == 'Library':
                        library_playlist_id = playlist_id
                        break
                
                if not library_playlist_id:
                    create_default_playlist()
                    library_playlist_id = current_playlist_id
                
                # Add old songs to Library playlist
                library_playlist = playlists[library_playlist_id]['playlist']
                
                for song_data in old_songs_data:
                    song = Song(song_data['title'], song_data['artist'], song_data['file_path'])
                    song.id = song_data['id']
                    song.added_at = datetime.fromisoformat(song_data['added_at'])
                    song.is_favorite = song_data.get('is_favorite', False)
                    song.play_count = song_data.get('play_count', 0)
                    if song_data.get('last_played'):
                        song.last_played = datetime.fromisoformat(song_data['last_played'])
                    library_playlist.add_song(song)
                
                # Set Library as current playlist
                current_playlist_id = library_playlist_id
                
                # Save the migrated data
                save_playlists()
                
                # Rename old file to prevent re-migration
                os.rename(old_playlist_file, f"{old_playlist_file}.migrated")
                print(f"Migrated {len(old_songs_data)} songs to Library playlist")
                
        except Exception as e:
            print(f"Error migrating old playlist data: {e}")

def create_default_playlist():
    """Create a default 'Library' playlist"""
    global current_playlist_id
    
    playlist_id = str(uuid.uuid4())
    current_playlist_id = playlist_id
    
    playlists[playlist_id] = {
        'name': 'Library',
        'description': 'Your main music library',
        'created_at': datetime.now().isoformat(),
        'playlist': Playlist()
    }
    save_playlists()

def get_current_playlist():
    """Get the currently active playlist"""
    if current_playlist_id and current_playlist_id in playlists:
        return playlists[current_playlist_id]['playlist']
    return None

# Load existing playlists on startup
load_playlists()

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/playlists', methods=['GET'])
def get_playlists():
    """Get all playlists"""
    playlists_list = []
    for playlist_id, playlist_info in playlists.items():
        playlists_list.append({
            'id': playlist_id,
            'name': playlist_info['name'],
            'description': playlist_info['description'],
            'created_at': playlist_info['created_at'],
            'song_count': playlist_info['playlist'].size,
            'is_current': playlist_id == current_playlist_id
        })
    return jsonify(playlists_list)

@app.route('/api/playlists/<playlist_id>/switch', methods=['POST'])
def switch_playlist(playlist_id):
    """Switch to a different playlist"""
    global current_playlist_id
    
    if playlist_id not in playlists:
        return jsonify({"success": False, "message": "Playlist not found"}), 404
    
    current_playlist_id = playlist_id
    save_playlists()
    return jsonify({"success": True, "message": "Playlist switched"})

@app.route('/api/playlist', methods=['GET'])
def get_playlist():
    current_playlist = get_current_playlist()
    if current_playlist:
        return jsonify(current_playlist.get_all_songs())
    return jsonify([])

@app.route('/api/current', methods=['GET'])
def get_current():
    current_playlist = get_current_playlist()
    if current_playlist:
        song = current_playlist.get_current_song()
        return jsonify(song.to_dict() if song else None)
    return jsonify(None)

@app.route('/api/add', methods=['POST'])
def add_song():
    current_playlist = get_current_playlist()
    if not current_playlist:
        return jsonify({"success": False, "message": "No active playlist"}), 400
    
    if 'file' not in request.files:
        return jsonify({"success": False, "message": "No file part"}), 400
    
    file = request.files['file']
    title = request.form.get('title')
    artist = request.form.get('artist')
    
    if file.filename == '':
        return jsonify({"success": False, "message": "No selected file"}), 400
        
    if file:
        filename = secure_filename(file.filename)
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(file_path)
        
        # Store relative path for frontend access
        relative_path = f"music/{filename}"
        
        # Extract metadata if not provided
        if not title or not artist:
            try:
                audio = MP3(file_path, ID3=EasyID3)
                if not title:
                    title = audio.get('title', [os.path.splitext(filename)[0]])[0]
                if not artist:
                    artist = audio.get('artist', ['Unknown Artist'])[0]
            except (ID3NoHeaderError, Exception):
                # Fallback if no tags or error
                if not title:
                    title = os.path.splitext(filename)[0]
                if not artist:
                    artist = "Unknown Artist"

        song = Song(title, artist, relative_path)
        current_playlist.add_song(song)
        save_playlists()  # Save after adding
        
        return jsonify({"success": True, "message": "Song added"})


@app.route('/api/remove/<song_id>', methods=['DELETE'])
def remove_song(song_id):
    current_playlist = get_current_playlist()
    if not current_playlist:
        return jsonify({"success": False, "message": "No active playlist"}), 400
    
    success = current_playlist.remove_song(song_id)
    if success:
        save_playlists()  # Save after removing
    return jsonify({"success": success})

@app.route('/api/next', methods=['POST'])
def next_song():
    current_playlist = get_current_playlist()
    if not current_playlist:
        return jsonify(None)
    
    song = current_playlist.next_song()
    return jsonify(song.to_dict() if song else None)

@app.route('/api/prev', methods=['POST'])
def prev_song():
    current_playlist = get_current_playlist()
    if not current_playlist:
        return jsonify(None)
    
    song = current_playlist.prev_song()
    return jsonify(song.to_dict() if song else None)

@app.route('/api/shuffle', methods=['POST'])
def shuffle_playlist():
    current_playlist = get_current_playlist()
    if not current_playlist:
        return jsonify({"success": False, "message": "No active playlist"}), 400
    
    current_playlist.shuffle()
    save_playlists()  # Save after shuffling
    return jsonify({"success": True})

@app.route('/api/sort/title', methods=['POST'])
def sort_by_title():
    current_playlist = get_current_playlist()
    if not current_playlist:
        return jsonify({"success": False, "message": "No active playlist"}), 400
    
    current_playlist.sort_by_title()
    save_playlists()  # Save after sorting
    return jsonify({"success": True})

@app.route('/api/sort/date', methods=['POST'])
def sort_by_date():
    current_playlist = get_current_playlist()
    if not current_playlist:
        return jsonify({"success": False, "message": "No active playlist"}), 400
    
    current_playlist.sort_by_date()
    save_playlists()  # Save after sorting
    return jsonify({"success": True})

@app.route('/api/favorites', methods=['GET'])
def get_favorites():
    current_playlist = get_current_playlist()
    if not current_playlist:
        return jsonify([])
    
    return jsonify(current_playlist.get_favorites())

@app.route('/api/favorite/<song_id>', methods=['POST'])
def toggle_favorite(song_id):
    current_playlist = get_current_playlist()
    if not current_playlist:
        return jsonify({"success": False, "message": "No active playlist"}), 400
    
    success = current_playlist.toggle_favorite(song_id)
    if success:
        save_playlists()  # Save after toggling favorite
    return jsonify({"success": success})

@app.route('/api/recent', methods=['GET'])
def get_recent():
    current_playlist = get_current_playlist()
    if not current_playlist:
        return jsonify([])
    
    return jsonify(current_playlist.get_recently_played())

@app.route('/api/play/<song_id>', methods=['POST'])
def mark_played(song_id):
    current_playlist = get_current_playlist()
    if not current_playlist:
        return jsonify({"success": False, "message": "No active playlist"}), 400
    
    success = current_playlist.mark_as_played(song_id)
    if success:
        save_playlists()  # Save after marking as played
    return jsonify({"success": success})

@app.route('/api/reorder', methods=['POST'])
def reorder_songs():
    current_playlist = get_current_playlist()
    if not current_playlist:
        return jsonify({"success": False, "message": "No active playlist"}), 400
    
    data = request.get_json()
    song_id = data.get('song_id')
    new_position = data.get('new_position')
    
    if song_id is None or new_position is None:
        return jsonify({"success": False, "message": "Missing song_id or new_position"}), 400
    
    success = current_playlist.move_song(song_id, new_position)
    if success:
        save_playlists()
    return jsonify({"success": success})

@app.route('/api/playlists', methods=['POST'])
def create_playlist():
    data = request.get_json()
    name = data.get('name')
    description = data.get('description', '')
    
    if not name:
        return jsonify({"success": False, "message": "Playlist name is required"}), 400
    
    # Create new playlist
    playlist_id = str(uuid.uuid4())
    playlists[playlist_id] = {
        'name': name,
        'description': description,
        'created_at': datetime.now().isoformat(),
        'playlist': Playlist()
    }
    
    save_playlists()
    return jsonify({
        "success": True, 
        "message": f"Playlist '{name}' created successfully",
        "playlist_id": playlist_id
    })

@app.route('/api/playlists/<playlist_id>', methods=['DELETE'])
def delete_playlist(playlist_id):
    """Delete a playlist"""
    global current_playlist_id
    
    if playlist_id not in playlists:
        return jsonify({"success": False, "message": "Playlist not found"}), 404
    
    playlist_name = playlists[playlist_id]['name']
    
    # Prevent deleting the last playlist
    if len(playlists) <= 1:
        return jsonify({"success": False, "message": "Cannot delete the last playlist"}), 400
    
    # If deleting current playlist, switch to another one
    if current_playlist_id == playlist_id:
        # Find another playlist to switch to
        for other_id in playlists.keys():
            if other_id != playlist_id:
                current_playlist_id = other_id
                break
    
    # Delete the playlist
    del playlists[playlist_id]
    save_playlists()
    
    return jsonify({
        "success": True, 
        "message": f"Playlist '{playlist_name}' deleted successfully"
    })

@app.route('/api/playlists/<playlist_id>/songs/<song_id>', methods=['DELETE'])
def remove_song_from_playlist(playlist_id, song_id):
    """Remove a song from a specific playlist"""
    if playlist_id not in playlists:
        return jsonify({"success": False, "message": "Playlist not found"}), 404
    
    playlist_obj = playlists[playlist_id]['playlist']
    success = playlist_obj.remove_song(song_id)
    
    if success:
        save_playlists()
        return jsonify({"success": True, "message": "Song removed from playlist"})
    else:
        return jsonify({"success": False, "message": "Song not found in playlist"}), 404

@app.route('/api/playlists/<playlist_id>/songs', methods=['POST'])
def add_song_to_playlist(playlist_id):
    """Add a song to a specific playlist"""
    if playlist_id not in playlists:
        return jsonify({"success": False, "message": "Playlist not found"}), 404
    
    data = request.get_json()
    song_id = data.get('song_id')
    source_playlist_id = data.get('source_playlist_id')
    
    if not song_id or not source_playlist_id:
        return jsonify({"success": False, "message": "Missing song_id or source_playlist_id"}), 400
    
    if source_playlist_id not in playlists:
        return jsonify({"success": False, "message": "Source playlist not found"}), 404
    
    # Find the song in source playlist
    source_playlist = playlists[source_playlist_id]['playlist']
    source_songs = source_playlist.get_all_songs()
    
    song_data = None
    for song_dict in source_songs:
        if song_dict['id'] == song_id:
            song_data = song_dict
            break
    
    if not song_data:
        return jsonify({"success": False, "message": "Song not found in source playlist"}), 404
    
    # Create new song object and add to target playlist
    song = Song(song_data['title'], song_data['artist'], song_data['file_path'])
    song.id = song_data['id']  # Keep same ID
    song.added_at = datetime.fromisoformat(song_data['added_at'])
    song.is_favorite = song_data.get('is_favorite', False)
    song.play_count = song_data.get('play_count', 0)
    if song_data.get('last_played'):
        song.last_played = datetime.fromisoformat(song_data['last_played'])
    
    target_playlist = playlists[playlist_id]['playlist']
    target_playlist.add_song(song)
    save_playlists()
    
    return jsonify({"success": True, "message": "Song added to playlist"})

@app.route('/api/playlists/<playlist_id>/update', methods=['PUT'])
def update_playlist(playlist_id):
    """Update playlist name and description"""
    if playlist_id not in playlists:
        return jsonify({"success": False, "message": "Playlist not found"}), 404
    
    data = request.get_json()
    name = data.get('name')
    description = data.get('description', '')
    
    if not name:
        return jsonify({"success": False, "message": "Playlist name is required"}), 400
    
    playlists[playlist_id]['name'] = name
    playlists[playlist_id]['description'] = description
    save_playlists()
    
    return jsonify({"success": True, "message": "Playlist updated successfully"})

if __name__ == '__main__':
    app.run(debug=True)
