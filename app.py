from flask import Flask, render_template, request, jsonify, send_from_directory
from adt import Playlist, Song
import os
import json
from werkzeug.utils import secure_filename
from mutagen.easyid3 import EasyID3
from mutagen.mp3 import MP3
from mutagen.id3 import ID3NoHeaderError
from datetime import datetime


app = Flask(__name__)
app.config['UPLOAD_FOLDER'] = 'static/music'
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max limit
PLAYLIST_FILE = 'playlist_data.json'

# Ensure upload directory exists
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

playlist = Playlist()

def save_playlist():
    """Save playlist to JSON file"""
    songs_data = []
    for song_dict in playlist.get_all_songs():
        songs_data.append(song_dict)
    
    with open(PLAYLIST_FILE, 'w') as f:
        json.dump(songs_data, f, indent=2)

def load_playlist():
    """Load playlist from JSON file"""
    if os.path.exists(PLAYLIST_FILE):
        try:
            with open(PLAYLIST_FILE, 'r') as f:
                songs_data = json.load(f)
            
            for song_data in songs_data:
                song = Song(song_data['title'], song_data['artist'], song_data['file_path'])
                song.id = song_data['id']
                song.added_at = datetime.fromisoformat(song_data['added_at'])
                song.is_favorite = song_data.get('is_favorite', False)
                song.play_count = song_data.get('play_count', 0)
                if song_data.get('last_played'):
                    song.last_played = datetime.fromisoformat(song_data['last_played'])
                playlist.add_song(song)
        except Exception as e:
            print(f"Error loading playlist: {e}")

# Load existing playlist on startup
load_playlist()

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/playlist', methods=['GET'])
def get_playlist():
    return jsonify(playlist.get_all_songs())

@app.route('/api/current', methods=['GET'])
def get_current():
    song = playlist.get_current_song()
    return jsonify(song.to_dict() if song else None)

@app.route('/api/add', methods=['POST'])
def add_song():
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
        playlist.add_song(song)
        save_playlist()  # Save after adding
        
        return jsonify({"success": True, "message": "Song added"})


@app.route('/api/remove/<song_id>', methods=['DELETE'])
def remove_song(song_id):
    success = playlist.remove_song(song_id)
    if success:
        save_playlist()  # Save after removing
    return jsonify({"success": success})

@app.route('/api/next', methods=['POST'])
def next_song():
    song = playlist.next_song()
    return jsonify(song.to_dict() if song else None)

@app.route('/api/prev', methods=['POST'])
def prev_song():
    song = playlist.prev_song()
    return jsonify(song.to_dict() if song else None)

@app.route('/api/shuffle', methods=['POST'])
def shuffle_playlist():
    playlist.shuffle()
    save_playlist()  # Save after shuffling
    return jsonify({"success": True})

@app.route('/api/sort/title', methods=['POST'])
def sort_by_title():
    playlist.sort_by_title()
    save_playlist()  # Save after sorting
    return jsonify({"success": True})

@app.route('/api/sort/date', methods=['POST'])
def sort_by_date():
    playlist.sort_by_date()
    save_playlist()  # Save after sorting
    return jsonify({"success": True})

@app.route('/api/favorites', methods=['GET'])
def get_favorites():
    return jsonify(playlist.get_favorites())

@app.route('/api/favorite/<song_id>', methods=['POST'])
def toggle_favorite(song_id):
    success = playlist.toggle_favorite(song_id)
    if success:
        save_playlist()  # Save after toggling favorite
    return jsonify({"success": success})

@app.route('/api/recent', methods=['GET'])
def get_recent():
    return jsonify(playlist.get_recently_played())

@app.route('/api/play/<song_id>', methods=['POST'])
def mark_played(song_id):
    success = playlist.mark_as_played(song_id)
    if success:
        save_playlist()  # Save after marking as played
    return jsonify({"success": success})

if __name__ == '__main__':
    app.run(debug=True)
