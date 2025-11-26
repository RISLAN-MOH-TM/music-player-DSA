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

    function renderPlaylist(songs) {
        playlistList.innerHTML = '';
        songs.forEach(song => {
            const li = document.createElement('li');
            li.className = 'playlist-item';
            // Highlight current song
            if (audioPlayer.src && audioPlayer.src.includes(song.file_path)) {
                li.classList.add('active');
            }

            // Format Date
            const dateObj = new Date(song.added_at);
            const dateStr = dateObj.toLocaleDateString();

            const heartIcon = song.is_favorite ? 'fa-solid fa-heart' : 'fa-regular fa-heart';
            
            li.innerHTML = `
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
                // Don't trigger if delete button clicked
                if (e.target.closest('.control-icon')) return;
                // Logic to play specific song could be added here if backend supported "play by id"
                // For now, just visual selection or maybe move to that song?
                // ADT doesn't easily support "jump to node", so we'll skip for now or implement later.
            });

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

    window.addEventListener('click', (e) => {
        if (e.target === addModal) {
            addModal.classList.add('hidden');
        }
    });

    addSongForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const formData = new FormData();
        formData.append('title', document.getElementById('title').value);
        formData.append('artist', document.getElementById('artist').value);
        formData.append('file', document.getElementById('song-file').files[0]);

        const response = await fetch('/api/add', {
            method: 'POST',
            body: formData
        });

        if (response.ok) {
            addModal.classList.add('hidden');
            addSongForm.reset();
            loadPlaylist();
        } else {
            alert('Failed to upload song');
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
    const favoritesNav = document.querySelector('.nav-item:nth-child(2)');
    const recentNav = document.querySelector('.nav-item:nth-child(3)');
    const libraryNav = document.querySelector('.nav-item:nth-child(1)');
    let currentView = 'library';

    favoritesNav.addEventListener('click', async () => {
        currentView = 'favorites';
        libraryNav.classList.remove('active');
        recentNav.classList.remove('active');
        favoritesNav.classList.add('active');
        
        const response = await fetch('/api/favorites');
        const favorites = await response.json();
        renderPlaylist(favorites);
    });

    recentNav.addEventListener('click', async () => {
        currentView = 'recent';
        libraryNav.classList.remove('active');
        favoritesNav.classList.remove('active');
        recentNav.classList.add('active');
        
        const response = await fetch('/api/recent');
        const recent = await response.json();
        renderPlaylist(recent);
    });

    libraryNav.addEventListener('click', () => {
        currentView = 'library';
        favoritesNav.classList.remove('active');
        recentNav.classList.remove('active');
        libraryNav.classList.add('active');
        loadPlaylist();
    });

    // Initial Load
    loadPlaylist();
});
