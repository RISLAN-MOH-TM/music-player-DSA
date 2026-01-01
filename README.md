# 🎵 Music Playlist Management System

A comprehensive music player application built with Python Flask and JavaScript that allows users to manage multiple playlists, upload music files, and enjoy advanced playlist management features.

## ✨ Features

### 📋 Playlist Management
- **Create unlimited custom playlists** - Organize your music into themed collections
- **Switch between playlists instantly** - Effortlessly navigate between different collections
- **Rename and edit playlist descriptions** - Customize your playlists with meaningful names
- **Delete playlists** with confirmation dialogs and safety measures
- **View song counts** for each playlist

### 🎶 Music Management
- **Upload audio files** with automatic metadata detection
- **Play, pause, and navigate tracks** with next/previous buttons
- **Add songs to specific playlists** - Each playlist maintains its own collection
- **Move songs between playlists** - Copy songs from one playlist to another
- **Drag and drop reordering** - Rearrange songs within playlists
- **Bulk selection and deletion** - Manage multiple songs at once

### ❤️ Enhanced Music Experience
- **Favorite songs** with individual playlist favorites
- **Shuffle functionality** for randomized playback
- **Sort by title or date added** for organized browsing
- **Recently played tracking** - See your most recently played tracks
- **Play count tracking** - Know which songs you enjoy most

### 🛠️ Technical Features
- **Doubly Linked List (DLL)** implementation for efficient playlist operations
- **JSON-based data persistence** for playlist and song data
- **Responsive web interface** with modern UI design
- **Cross-platform compatibility** - Works on Windows, Mac, and Linux

## 🛠️ Tech Stack

- **Backend**: Python Flask
- **Frontend**: HTML, CSS, JavaScript
- **Data Structure**: Custom Doubly Linked List implementation
- **File Storage**: Local file system for music files
- **Data Storage**: JSON files for playlist metadata

## 🚀 Getting Started

### Prerequisites
- Python 3.7 or higher
- pip (Python package installer)

### Installation

1. **Clone the repository** (if you haven't already):
   ```bash
   git clone https://github.com/RISLAN-MOH-TM/music-player-DSA.git
   cd music-player-DSA
   ```

2. **Install required dependencies**:
   ```bash
   pip install flask mutagen
   ```

3. **Run the application**:
   ```bash
   python app.py
   ```
   
   Or on Windows, you can run:
   ```bash
   run.bat
   ```

4. **Open your browser** and navigate to `http://localhost:5000`

### Dependencies
The application requires the following Python packages:
- Flask
- Mutagen (for reading audio file metadata)

## 🎯 How to Use

### Creating a New Playlist
1. Click the "Create Playlist" button in the header
2. Enter playlist name and optional description
3. Click "Create Playlist"
4. The new playlist will appear in the sidebar

### Managing Playlists
- **Switch playlists**: Click any playlist name in the sidebar
- **Edit playlist**: Hover over a playlist and click the gear (⚙️) icon
- **Delete playlist**: Hover over a playlist and click the trash icon

### Adding Songs
1. Switch to the playlist you want to add songs to
2. Click the "Add Song" button
3. Select your audio file
4. The song will be added to the currently active playlist

### Advanced Features
- **Playlist Management Modal**: Click the gear icon next to any playlist to access:
  - **Songs Tab**: View, reorder, and manage songs within the playlist
  - **Add Songs Tab**: Copy songs from other playlists
  - **Settings Tab**: Edit playlist information or delete the entire playlist

- **Bulk Operations**: Select multiple songs using checkboxes and perform bulk actions

## 🏗️ Project Structure

```
Music Playlist Management System/
├── app.py                 # Main Flask application
├── adt.py                 # Data structure implementation (Doubly Linked List)
├── run.bat               # Windows startup script
├── static/
│   ├── css/style.css     # Styling for the application
│   ├── js/main.js        # Frontend JavaScript functionality
│   └── music/            # Directory for uploaded music files
├── templates/
│   └── index.html        # Main HTML template
├── playlists_data.json   # Persistent storage for playlists
└── README.md            # This file
```

## 📊 Data Structure Implementation

The application uses a custom Doubly Linked List implementation for efficient playlist management:

- **Node**: Represents a single song in the playlist
- **Playlist**: Manages the collection of songs with operations like:
  - Add/remove songs
  - Navigate next/previous
  - Shuffle and sort
  - Move songs within the playlist

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

If you encounter any issues or have questions about the application, please open an issue in the GitHub repository.

## 🙏 Acknowledgments

- Flask framework for the web application foundation
- Mutagen library for audio metadata processing
- All contributors who helped improve the application