document.addEventListener('DOMContentLoaded', () => {
    const playlistList = document.getElementById('playlist-list');
    const currentTitle = document.getElementById('current-title');
    const currentArtist = document.getElementById('current-artist');
    const playPauseBtn = document.getElementById('play-pause-btn');
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    const shuffleBtn = document.getElementById('shuffle-btn');
    const repeatBtn = document.getElementById('repeat-btn');
    const addSongBtn = document.getElementById('add-song-btn');
    const addModal = document.getElementById('add-modal');
    const closeModal = document.getElementById('close-modal');
    const addSongForm = document.getElementById('add-song-form');
    const audioPlayer = document.getElementById('audio-player');

    // Create Playlist Elements
    const createPlaylistBtn = document.getElementById('create-playlist-btn');
    const createPlaylistModal = document.getElementById('create-playlist-modal');
    const closePlaylistModal = document.getElementById('close-playlist-modal');
    const createPlaylistForm = document.getElementById('create-playlist-form');
    
    // Playlist navigation elements
    const playlistsList = document.getElementById('playlists-list');
    const refreshPlaylistsBtn = document.getElementById('refresh-playlists-btn');
    const libraryNav = document.getElementById('library-nav');
    const favoritesNav = document.getElementById('favorites-nav');
    const recentNav = document.getElementById('recent-nav');

    // New UI Elements
    const sortTitleBtn = document.getElementById('sort-title');
    const sortDateBtn = document.getElementById('sort-date');
    const progressBar = document.querySelector('.progress-bar');
    const progressFill = document.querySelector('.progress-fill');
    const currentTimeEl = document.querySelector('.time.current');
    const totalTimeEl = document.querySelector('.time.total');
    const volumeSlider = document.querySelector('.volume-slider');

    let isPlaying = false;
    let isRepeatOn = false;
    let isShuffleOn = false;

    // Fetch and render playlist
    async function loadPlaylist() {
        const response = await fetch('/api/playlist');
        const songs = await response.json();
        renderPlaylist(songs);
        // Only load current song if not already playing or set
        if (!audioPlayer.src) {
            loadCurrentSong(false);
        }
    }

    // Load and display playlists in sidebar
    let currentPlaylists = []; // Store current playlists for reference
    
    async function loadPlaylists() {
        try {
            const response = await fetch('/api/playlists');
            const playlists = await response.json();
            currentPlaylists = playlists; // Store for reference
            renderPlaylists(playlists);
        } catch (error) {
            console.error('Error loading playlists:', error);
        }
    }

    function renderPlaylists(playlists) {
        playlistsList.innerHTML = '';
        
        playlists.forEach(playlist => {
            const li = document.createElement('li');
            li.className = 'playlist-item-nav';
            li.dataset.playlistId = playlist.id;
            
            if (playlist.is_current) {
                li.classList.add('active');
            }
            
            li.innerHTML = `
                <div class="playlist-info">
                    <div class="playlist-name">${playlist.name}</div>
                    <div class="playlist-count">${playlist.song_count} songs</div>
                </div>
                <div class="playlist-actions">
                    <button class="playlist-manage-btn" title="Manage playlist">
                        <i class="fa-solid fa-cog"></i>
                    </button>
                    <button class="playlist-delete-btn" title="Delete playlist">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </div>
            `;
            
            // Add click event for switching playlist
            const playlistInfo = li.querySelector('.playlist-info');
            playlistInfo.addEventListener('click', () => switchPlaylist(playlist.id));
            
            // Add click event for manage button
            const manageBtn = li.querySelector('.playlist-manage-btn');
            manageBtn.addEventListener('click', (event) => {
                event.stopPropagation();
                openPlaylistManagement(playlist.id);
            });
            
            // Add click event for delete button
            const deleteBtn = li.querySelector('.playlist-delete-btn');
            deleteBtn.addEventListener('click', (event) => deletePlaylist(playlist.id, event));
            
            playlistsList.appendChild(li);
        });
    }

    async function deletePlaylist(playlistId, event) {
        event.stopPropagation(); // Prevent switching to playlist when clicking delete
        
        const playlist = currentPlaylists.find(p => p.id === playlistId);
        if (!playlist) return;
        
        if (confirm(`Are you sure you want to delete "${playlist.name}"? This action cannot be undone.`)) {
            try {
                const response = await fetch(`/api/playlists/${playlistId}`, {
                    method: 'DELETE'
                });
                
                const result = await response.json();
                
                if (response.ok && result.success) {
                    loadPlaylists(); // Refresh playlist list
                    loadPlaylist();  // Refresh current playlist view
                    alert(result.message);
                } else {
                    alert(result.message || 'Failed to delete playlist');
                }
            } catch (error) {
                console.error('Error deleting playlist:', error);
                alert('Error deleting playlist. Please try again.');
            }
        }
    }

    // Make functions available globally
    window.deletePlaylist = deletePlaylist;
    window.switchPlaylist = switchPlaylist;

    // Playlist Management Modal
    const playlistManagementModal = document.getElementById('playlist-management-modal');
    const closeManageModal = document.getElementById('close-manage-modal');
    let currentManagingPlaylistId = null;

    async function openPlaylistManagement(playlistId) {
        currentManagingPlaylistId = playlistId;
        const playlist = currentPlaylists.find(p => p.id === playlistId);
        
        if (!playlist) return;
        
        document.getElementById('manage-playlist-title').textContent = `Manage "${playlist.name}"`;
        document.getElementById('edit-playlist-name').value = playlist.name;
        document.getElementById('edit-playlist-description').value = playlist.description || '';
        
        // Load playlist songs
        await loadPlaylistSongs(playlistId);
        
        // Load available playlists for adding songs
        await loadSourcePlaylists(playlistId);
        
        playlistManagementModal.classList.remove('hidden');
    }

    async function loadPlaylistSongs(playlistId) {
        try {
            // Switch to the playlist temporarily to get its songs
            const currentPlaylist = currentPlaylists.find(p => p.is_current);
            const currentId = currentPlaylist ? currentPlaylist.id : null;
            
            // Switch to target playlist
            await fetch(`/api/playlists/${playlistId}/switch`, { method: 'POST' });
            
            // Get songs
            const response = await fetch('/api/playlist');
            const songs = await response.json();
            
            // Switch back to original playlist
            if (currentId && currentId !== playlistId) {
                await fetch(`/api/playlists/${currentId}/switch`, { method: 'POST' });
            }
            
            renderManagePlaylistSongs(songs);
        } catch (error) {
            console.error('Error loading playlist songs:', error);
        }
    }

    function renderManagePlaylistSongs(songs) {
        const songsList = document.getElementById('manage-playlist-songs');
        songsList.innerHTML = '';
        
        songs.forEach(song => {
            const li = document.createElement('li');
            li.className = 'manage-song-item';
            li.draggable = true;
            li.dataset.songId = song.id;
            
            li.innerHTML = `
                <input type="checkbox" class="song-checkbox" value="${song.id}">
                <div class="drag-handle"><i class="fa-solid fa-grip-vertical"></i></div>
                <div class="song-info">
                    <div class="song-title">${song.title}</div>
                    <div class="song-artist">${song.artist}</div>
                </div>
                <button class="remove-song-btn" onclick="removeSongFromPlaylist('${song.id}')">
                    <i class="fa-solid fa-times"></i>
                </button>
            `;
            
            songsList.appendChild(li);
        });
    }

    // Tab switching
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const tabName = btn.dataset.tab;
            
            // Update active tab button
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            // Update active tab pane
            document.querySelectorAll('.tab-pane').forEach(pane => pane.classList.remove('active'));
            document.getElementById(`${tabName}-tab`).classList.add('active');
        });
    });

    // Close management modal
    closeManageModal.addEventListener('click', () => {
        playlistManagementModal.classList.add('hidden');
    });

    window.addEventListener('click', (e) => {
        if (e.target === addModal) {
            addModal.classList.add('hidden');
        }
        if (e.target === createPlaylistModal) {
            createPlaylistModal.classList.add('hidden');
        }
        if (e.target === playlistManagementModal) {
            playlistManagementModal.classList.add('hidden');
        }
    });

    // Playlist management functions
    async function loadSourcePlaylists(excludePlaylistId) {
        const select = document.getElementById('source-playlist-select');
        select.innerHTML = '<option value="">Select a playlist...</option>';
        
        currentPlaylists.forEach(playlist => {
            if (playlist.id !== excludePlaylistId) {
                const option = document.createElement('option');
                option.value = playlist.id;
                option.textContent = `${playlist.name} (${playlist.song_count} songs)`;
                select.appendChild(option);
            }
        });
        
        select.addEventListener('change', async () => {
            if (select.value) {
                await loadAvailableSongs(select.value);
            }
        });
    }

    async function loadAvailableSongs(sourcePlaylistId) {
        try {
            // Get songs from source playlist
            const currentPlaylist = currentPlaylists.find(p => p.is_current);
            const currentId = currentPlaylist ? currentPlaylist.id : null;
            
            // Switch to source playlist
            await fetch(`/api/playlists/${sourcePlaylistId}/switch`, { method: 'POST' });
            
            // Get songs
            const response = await fetch('/api/playlist');
            const songs = await response.json();
            
            // Switch back
            if (currentId) {
                await fetch(`/api/playlists/${currentId}/switch`, { method: 'POST' });
            }
            
            renderAvailableSongs(songs, sourcePlaylistId);
        } catch (error) {
            console.error('Error loading available songs:', error);
        }
    }

    function renderAvailableSongs(songs, sourcePlaylistId) {
        const songsList = document.getElementById('available-songs-list');
        songsList.innerHTML = '';
        
        songs.forEach(song => {
            const li = document.createElement('li');
            li.className = 'available-song-item';
            
            li.innerHTML = `
                <div class="song-info">
                    <div class="song-title">${song.title}</div>
                    <div class="song-artist">${song.artist}</div>
                </div>
                <button class="add-song-btn" onclick="addSongToCurrentPlaylist('${song.id}', '${sourcePlaylistId}')">
                    <i class="fa-solid fa-plus"></i>
                </button>
            `;
            
            songsList.appendChild(li);
        });
    }

    // Global functions for playlist management
    window.removeSongFromPlaylist = async function(songId) {
        if (!currentManagingPlaylistId) return;
        
        try {
            const response = await fetch(`/api/playlists/${currentManagingPlaylistId}/songs/${songId}`, {
                method: 'DELETE'
            });
            
            const result = await response.json();
            
            if (response.ok && result.success) {
                await loadPlaylistSongs(currentManagingPlaylistId);
                loadPlaylists(); // Refresh sidebar
            } else {
                alert(result.message || 'Failed to remove song');
            }
        } catch (error) {
            console.error('Error removing song:', error);
        }
    };

    window.addSongToCurrentPlaylist = async function(songId, sourcePlaylistId) {
        if (!currentManagingPlaylistId) return;
        
        try {
            const response = await fetch(`/api/playlists/${currentManagingPlaylistId}/songs`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    song_id: songId,
                    source_playlist_id: sourcePlaylistId
                })
            });
            
            const result = await response.json();
            
            if (response.ok && result.success) {
                await loadPlaylistSongs(currentManagingPlaylistId);
                loadPlaylists(); // Refresh sidebar
                alert('Song added to playlist!');
            } else {
                alert(result.message || 'Failed to add song');
            }
        } catch (error) {
            console.error('Error adding song:', error);
        }
    };

    // Save playlist settings
    document.getElementById('save-playlist-settings').addEventListener('click', async () => {
        if (!currentManagingPlaylistId) return;
        
        const name = document.getElementById('edit-playlist-name').value;
        const description = document.getElementById('edit-playlist-description').value;
        
        if (!name.trim()) {
            alert('Playlist name is required');
            return;
        }
        
        try {
            const response = await fetch(`/api/playlists/${currentManagingPlaylistId}/update`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    name: name,
                    description: description
                })
            });
            
            const result = await response.json();
            
            if (response.ok && result.success) {
                loadPlaylists(); // Refresh sidebar
                document.getElementById('manage-playlist-title').textContent = `Manage "${name}"`;
                alert('Playlist updated successfully!');
            } else {
                alert(result.message || 'Failed to update playlist');
            }
        } catch (error) {
            console.error('Error updating playlist:', error);
        }
    });

    // Delete playlist from management modal
    document.getElementById('delete-playlist-btn').addEventListener('click', async () => {
        if (!currentManagingPlaylistId) return;
        
        const playlist = currentPlaylists.find(p => p.id === currentManagingPlaylistId);
        if (!playlist) return;
        
        if (confirm(`Are you sure you want to delete "${playlist.name}"? This action cannot be undone.`)) {
            try {
                const response = await fetch(`/api/playlists/${currentManagingPlaylistId}`, {
                    method: 'DELETE'
                });
                
                const result = await response.json();
                
                if (response.ok && result.success) {
                    playlistManagementModal.classList.add('hidden');
                    loadPlaylists();
                    loadPlaylist();
                    alert(result.message);
                } else {
                    alert(result.message || 'Failed to delete playlist');
                }
            } catch (error) {
                console.error('Error deleting playlist:', error);
            }
        }
    });

    async function switchPlaylist(playlistId) {
        try {
            const response = await fetch(`/api/playlists/${playlistId}/switch`, {
                method: 'POST'
            });
            
            if (response.ok) {
                loadPlaylists(); // Refresh playlist list
                loadPlaylist();  // Refresh current playlist view
                
                // Update navigation state
                libraryNav.classList.remove('active');
                favoritesNav.classList.remove('active');
                recentNav.classList.remove('active');
                
                currentView = 'playlist';
            }
        } catch (error) {
            console.error('Error switching playlist:', error);
        }
    }

    function renderPlaylist(songs) {
        playlistList.innerHTML = '';
        songs.forEach((song, index) => {
            const li = document.createElement('li');
            li.className = 'playlist-item';
            li.draggable = true;
            li.dataset.songId = song.id;
            li.dataset.index = index;
            
            // Highlight current song
            if (audioPlayer.src && audioPlayer.src.includes(song.file_path)) {
                li.classList.add('active');
            }

            // Format Date
            const dateObj = new Date(song.added_at);
            const dateStr = dateObj.toLocaleDateString();

            const heartIcon = song.is_favorite ? 'fa-solid fa-heart' : 'fa-regular fa-heart';
            
            li.innerHTML = `
                <div class="drag-handle"><i class="fa-solid fa-grip-vertical"></i></div>
                <div class="song-title">${song.title}</div>
                <div class="song-artist">${song.artist}</div>
                <div class="col-time">${dateStr}</div>
                <div class="col-actions">
                    <button class="control-icon favorite-btn" onclick="toggleFavorite('${song.id}', event)"><i class="${heartIcon}"></i></button>
                    <button class="control-icon" onclick="removeSong('${song.id}', event)"><i class="fa-solid fa-trash"></i></button>
                </div>
            `;

            // Click to play
            li.addEventListener('click', (e) => {
                // Don't trigger if delete button clicked or drag handle
                if (e.target.closest('.control-icon') || e.target.closest('.drag-handle')) return;
                
                // Play the clicked song
                playSong(song);
            });

            // Drag and drop events
            li.addEventListener('dragstart', handleDragStart);
            li.addEventListener('dragover', handleDragOver);
            li.addEventListener('dragleave', handleDragLeave);
            li.addEventListener('drop', handleDrop);
            li.addEventListener('dragend', handleDragEnd);

            playlistList.appendChild(li);
        });
    }

    async function loadCurrentSong(autoPlay = false) {
        const response = await fetch('/api/current');
        const song = await response.json();
        updatePlayerUI(song, autoPlay);
    }

    function updatePlayerUI(song, autoPlay) {
        if (song) {
            currentTitle.textContent = song.title;
            currentArtist.textContent = song.artist;
            currentSongId = song.id;
            hasMarkedAsPlayed = false;

            const songUrl = `/static/${song.file_path}`;
            if (!audioPlayer.src.includes(songUrl)) {
                audioPlayer.src = songUrl;
                if (autoPlay) {
                    audioPlayer.play();
                    isPlaying = true;
                }
            }
        } else {
            currentTitle.textContent = "Select a song";
            currentArtist.textContent = "--";
            audioPlayer.src = "";
            isPlaying = false;
            currentSongId = null;
        }
        updatePlayButton();

        // Re-render list to update active state
        // Optimize: don't fetch again, just update classes? 
        // For prototype, fetching is fine.
        fetch('/api/playlist').then(r => r.json()).then(renderPlaylist);
    }

    function playSong(song) {
        currentTitle.textContent = song.title;
        currentArtist.textContent = song.artist;
        currentSongId = song.id;
        hasMarkedAsPlayed = false;

        const songUrl = `/static/${song.file_path}`;
        audioPlayer.src = songUrl;
        audioPlayer.play();
        isPlaying = true;
        updatePlayButton();

        // Re-render list to update active state
        fetch('/api/playlist').then(r => r.json()).then(renderPlaylist);
    }

    // Controls
    playPauseBtn.addEventListener('click', () => {
        if (!audioPlayer.src) return;

        if (isPlaying) {
            audioPlayer.pause();
        } else {
            audioPlayer.play();
        }
        isPlaying = !isPlaying;
        updatePlayButton();
    });

    function updatePlayButton() {
        const icon = playPauseBtn.querySelector('i');
        if (isPlaying) {
            icon.classList.remove('fa-play');
            icon.classList.add('fa-pause');
        } else {
            icon.classList.remove('fa-pause');
            icon.classList.add('fa-play');
        }
    }

    // Track when song starts playing
    let currentSongId = null;
    let hasMarkedAsPlayed = false;

    // Audio Events
    audioPlayer.addEventListener('ended', () => {
        if (isRepeatOn) {
            // Repeat current song
            audioPlayer.currentTime = 0;
            audioPlayer.play();
        } else {
            // Go to next song
            nextBtn.click();
        }
    });

    audioPlayer.addEventListener('play', () => {
        isPlaying = true;
        updatePlayButton();
        
        // Mark song as played after 3 seconds of playback
        if (!hasMarkedAsPlayed) {
            setTimeout(async () => {
                if (isPlaying && currentSongId) {
                    await fetch(`/api/play/${currentSongId}`, { method: 'POST' });
                    hasMarkedAsPlayed = true;
                }
            }, 3000);
        }
    });

    audioPlayer.addEventListener('pause', () => {
        isPlaying = false;
        updatePlayButton();
    });

    audioPlayer.addEventListener('timeupdate', () => {
        const { currentTime, duration } = audioPlayer;
        if (isNaN(duration)) return;

        const progressPercent = (currentTime / duration) * 100;
        progressFill.style.width = `${progressPercent}%`;

        currentTimeEl.textContent = formatTime(currentTime);
        totalTimeEl.textContent = formatTime(duration);
    });

    function formatTime(seconds) {
        const min = Math.floor(seconds / 60);
        const sec = Math.floor(seconds % 60);
        return `${min}:${sec < 10 ? '0' : ''}${sec}`;
    }

    // Progress Bar Click
    progressBar.addEventListener('click', (e) => {
        const width = progressBar.clientWidth;
        const clickX = e.offsetX;
        const duration = audioPlayer.duration;

        audioPlayer.currentTime = (clickX / width) * duration;
    });

    // Volume
    volumeSlider.addEventListener('input', (e) => {
        audioPlayer.volume = e.target.value / 100;
    });

    // Navigation
    nextBtn.addEventListener('click', async () => {
        const response = await fetch('/api/next', { method: 'POST' });
        const song = await response.json();
        updatePlayerUI(song, true);
    });

    prevBtn.addEventListener('click', async () => {
        const response = await fetch('/api/prev', { method: 'POST' });
        const song = await response.json();
        updatePlayerUI(song, true);
    });

    shuffleBtn.addEventListener('click', async () => {
        isShuffleOn = !isShuffleOn;
        shuffleBtn.classList.toggle('active');
        
        if (isShuffleOn) {
            // Shuffle the playlist
            await fetch('/api/shuffle', { method: 'POST' });
            loadPlaylist();
        }
    });

    repeatBtn.addEventListener('click', () => {
        isRepeatOn = !isRepeatOn;
        repeatBtn.classList.toggle('active');
        
        // Visual feedback
        if (isRepeatOn) {
            repeatBtn.style.color = '#ff3b30';
        } else {
            repeatBtn.style.color = '';
        }
    });


    // Sorting
    sortTitleBtn.addEventListener('click', async () => {
        await fetch('/api/sort/title', { method: 'POST' });
        loadPlaylist();
    });

    sortDateBtn.addEventListener('click', async () => {
        await fetch('/api/sort/date', { method: 'POST' });
        loadPlaylist();
    });

    // Add Song Modal
    addSongBtn.addEventListener('click', () => {
        addModal.classList.remove('hidden');
    });

    closeModal.addEventListener('click', () => {
        addModal.classList.add('hidden');
    });

    // Create Playlist Modal
    createPlaylistBtn.addEventListener('click', () => {
        createPlaylistModal.classList.remove('hidden');
    });

    closePlaylistModal.addEventListener('click', () => {
        createPlaylistModal.classList.add('hidden');
    });

    window.addEventListener('click', (e) => {
        if (e.target === addModal) {
            addModal.classList.add('hidden');
        }
        if (e.target === createPlaylistModal) {
            createPlaylistModal.classList.add('hidden');
        }
    });

    addSongForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const fileInput = document.getElementById('song-file');
        if (!fileInput.files[0]) {
            alert('Please select an audio file');
            return;
        }

        const formData = new FormData();
        formData.append('title', document.getElementById('title').value);
        formData.append('artist', document.getElementById('artist').value);
        formData.append('file', fileInput.files[0]);

        try {
            const response = await fetch('/api/add', {
                method: 'POST',
                body: formData
            });

            const result = await response.json();

            if (response.ok && result.success) {
                addModal.classList.add('hidden');
                addSongForm.reset();
                loadPlaylist();
                alert('Song added successfully!');
            } else {
                alert(result.message || 'Failed to upload song');
            }
        } catch (error) {
            console.error('Error uploading song:', error);
            alert('Error uploading song. Please try again.');
        }
    });

    // Create Playlist Form
    createPlaylistForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const playlistName = document.getElementById('playlist-name').value;
        const playlistDescription = document.getElementById('playlist-description').value;

        if (!playlistName.trim()) {
            alert('Please enter a playlist name');
            return;
        }

        try {
            const response = await fetch('/api/playlists', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    name: playlistName,
                    description: playlistDescription
                })
            });

            const result = await response.json();

            if (response.ok && result.success) {
                createPlaylistModal.classList.add('hidden');
                createPlaylistForm.reset();
                loadPlaylists(); // Refresh playlists list
                alert('Playlist created successfully!');
            } else {
                alert(result.message || 'Failed to create playlist');
            }
        } catch (error) {
            console.error('Error creating playlist:', error);
            alert('Error creating playlist. Please try again.');
        }
    });

    // Global function for remove
    window.removeSong = async (id, event) => {
        if (event) event.stopPropagation();
        if (confirm('Remove this song?')) {
            await fetch(`/api/remove/${id}`, { method: 'DELETE' });
            loadPlaylist();
        }
    };

    // Global function for toggle favorite
    window.toggleFavorite = async (id, event) => {
        if (event) event.stopPropagation();
        await fetch(`/api/favorite/${id}`, { method: 'POST' });
        loadPlaylist();
    };

    // Navigation views
    let currentView = 'library';

    favoritesNav.addEventListener('click', async () => {
        currentView = 'favorites';
        libraryNav.classList.remove('active');
        recentNav.classList.remove('active');
        favoritesNav.classList.add('active');
        
        // Remove active state from playlists
        document.querySelectorAll('.playlist-item-nav').forEach(item => {
            item.classList.remove('active');
        });
        
        const response = await fetch('/api/favorites');
        const favorites = await response.json();
        renderPlaylist(favorites);
    });

    recentNav.addEventListener('click', async () => {
        currentView = 'recent';
        libraryNav.classList.remove('active');
        favoritesNav.classList.remove('active');
        recentNav.classList.add('active');
        
        // Remove active state from playlists
        document.querySelectorAll('.playlist-item-nav').forEach(item => {
            item.classList.remove('active');
        });
        
        const response = await fetch('/api/recent');
        const recent = await response.json();
        renderPlaylist(recent);
    });

    libraryNav.addEventListener('click', () => {
        currentView = 'library';
        favoritesNav.classList.remove('active');
        recentNav.classList.remove('active');
        libraryNav.classList.add('active');
        
        // Remove active state from playlists
        document.querySelectorAll('.playlist-item-nav').forEach(item => {
            item.classList.remove('active');
        });
        
        loadPlaylist();
    });

    // Refresh playlists button
    refreshPlaylistsBtn.addEventListener('click', () => {
        loadPlaylists();
    });

    // Initial Load
    loadPlaylists();
    loadPlaylist();

    // Drag and Drop functionality
    let draggedElement = null;

    function handleDragStart(e) {
        draggedElement = this;
        this.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/html', this.outerHTML);
    }

    function handleDragOver(e) {
        if (e.preventDefault) {
            e.preventDefault();
        }
        e.dataTransfer.dropEffect = 'move';
        
        // Add visual feedback
        this.classList.add('drag-over');
        return false;
    }

    function handleDragLeave(e) {
        this.classList.remove('drag-over');
    }

    function handleDrop(e) {
        if (e.stopPropagation) {
            e.stopPropagation();
        }

        this.classList.remove('drag-over');

        if (draggedElement !== this) {
            const draggedId = draggedElement.dataset.songId;
            const targetIndex = parseInt(this.dataset.index);
            
            // Call API to reorder
            reorderSong(draggedId, targetIndex);
        }
        return false;
    }

    function handleDragEnd(e) {
        this.classList.remove('dragging');
        // Remove drag-over class from all items
        document.querySelectorAll('.playlist-item').forEach(item => {
            item.classList.remove('drag-over');
        });
        draggedElement = null;
    }

    async function reorderSong(songId, newPosition) {
        try {
            const response = await fetch('/api/reorder', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    song_id: songId,
                    new_position: newPosition
                })
            });

            if (response.ok) {
                loadPlaylist(); // Reload to show new order
            } else {
                console.error('Failed to reorder song');
            }
        } catch (error) {
            console.error('Error reordering song:', error);
        }
    }
});
