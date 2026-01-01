import random
import uuid
from datetime import datetime

class Song:
    def __init__(self, title, artist, file_path):
        self.id = str(uuid.uuid4())
        self.title = title
        self.artist = artist
        self.file_path = file_path
        self.added_at = datetime.now()
        self.is_favorite = False
        self.last_played = None
        self.play_count = 0

    def to_dict(self):
        return {
            "id": self.id,
            "title": self.title,
            "artist": self.artist,
            "file_path": self.file_path,
            "added_at": self.added_at.isoformat(),
            "is_favorite": self.is_favorite,
            "last_played": self.last_played.isoformat() if self.last_played else None,
            "play_count": self.play_count
        }

class Node:
    def __init__(self, song):
        self.song = song
        self.next = None
        self.prev = None

class Playlist:
    def __init__(self):
        self.head = None
        self.tail = None
        self.current = None
        self.size = 0
    
    def is_empty(self):
        return self.size == 0
    
    def contains_song(self, file_path):
        """Check if a song with the same file path already exists in the playlist"""
        current = self.head
        while current:
            if current.song.file_path == file_path:
                return True
            current = current.next
        return False

    def add_song(self, song):
        new_node = Node(song)
        if not self.head:
            self.head = new_node
            self.tail = new_node
            self.current = new_node  # Set current to first song added
        else:
            self.tail.next = new_node
            new_node.prev = self.tail
            self.tail = new_node
        self.size += 1

    def remove_song(self, song_id):
        current = self.head
        while current:
            if current.song.id == song_id:
                # Update current pointer if we are removing the current song
                if self.current == current:
                    self.current = current.next if current.next else current.prev

                if current.prev:
                    current.prev.next = current.next
                else:
                    self.head = current.next

                if current.next:
                    current.next.prev = current.prev
                else:
                    self.tail = current.prev

                self.size -= 1
                return True
            current = current.next
        return False

    def get_current_song(self):
        return self.current.song if self.current else None

    def next_song(self):
        if self.current and self.current.next:
            self.current = self.current.next
        return self.get_current_song()

    def prev_song(self):
        if self.current and self.current.prev:
            self.current = self.current.prev
        return self.get_current_song()

    def get_all_songs(self):
        songs = []
        current = self.head
        while current:
            songs.append(current.song.to_dict())
            current = current.next
        return songs

    def get_favorites(self):
        favorites = []
        current = self.head
        while current:
            if current.song.is_favorite:
                favorites.append(current.song.to_dict())
            current = current.next
        return favorites

    def toggle_favorite(self, song_id):
        current = self.head
        while current:
            if current.song.id == song_id:
                current.song.is_favorite = not current.song.is_favorite
                return True
            current = current.next
        return False

    def mark_as_played(self, song_id):
        """Mark a song as played and update play count"""
        current = self.head
        while current:
            if current.song.id == song_id:
                current.song.last_played = datetime.now()
                current.song.play_count += 1
                return True
            current = current.next
        return False

    def get_recently_played(self, limit=20):
        """Get recently played songs sorted by last played time"""
        recent = []
        current = self.head
        while current:
            if current.song.last_played:
                recent.append(current.song)
            current = current.next
        
        # Sort by last_played descending (most recent first)
        recent.sort(key=lambda s: s.last_played, reverse=True)
        
        # Return limited results
        return [song.to_dict() for song in recent[:limit]]

    def shuffle(self):
        # Convert to list, shuffle, rebuild DLL
        if self.size < 2:
            return

        songs = []
        current = self.head
        while current:
            songs.append(current.song)
            current = current.next
        
        random.shuffle(songs)
        
        # Rebuild
        self.head = None
        self.tail = None
        self.current = None
        self.size = 0
        
        for song in songs:
            self.add_song(song)
        
        # Reset current to head
        self.current = self.head

    def move_song(self, song_id, new_position):
        # Find the node
        target = None
        current = self.head
        while current:
            if current.song.id == song_id:
                target = current
                break
            current = current.next
        
        if not target:
            return False
            
        # Remove from current position
        if target.prev:
            target.prev.next = target.next
        else:
            self.head = target.next
            
        if target.next:
            target.next.prev = target.prev
        else:
            self.tail = target.prev
            
        self.size -= 1
        
        # Re-insert at new position
        # This is a simplified insertion, 0-indexed
        if new_position <= 0:
            # Insert at head
            target.next = self.head
            target.prev = None
            if self.head:
                self.head.prev = target
            self.head = target
            if not self.tail:
                self.tail = target
        elif new_position >= self.size:
            # Insert at tail
            target.next = None
            target.prev = self.tail
            if self.tail:
                self.tail.next = target
            self.tail = target
            if not self.head:
                self.head = target
        else:
            # Insert in middle
            curr = self.head
            for _ in range(new_position - 1):
                curr = curr.next
            
            target.next = curr.next
            target.prev = curr
            if curr.next:
                curr.next.prev = target
            curr.next = target
            
        self.size += 1
        return True

    def sort_by_title(self):
        if self.size < 2: return
        self.head = self._merge_sort(self.head, lambda s: s.title.lower())
        self._rebuild_links()

    def sort_by_date(self):
        if self.size < 2: return
        # Sort by added_at descending (newest first)
        self.head = self._merge_sort(self.head, lambda s: s.added_at, reverse=True)
        self._rebuild_links()

    def _merge_sort(self, head, key_func, reverse=False):
        if not head or not head.next:
            return head
        
        second = self._split(head)
        
        head = self._merge_sort(head, key_func, reverse)
        second = self._merge_sort(second, key_func, reverse)
        
        return self._merge(head, second, key_func, reverse)

    def _split(self, head):
        fast = head
        slow = head
        while fast.next and fast.next.next:
            fast = fast.next.next
            slow = slow.next
        
        temp = slow.next
        slow.next = None
        if temp:
            temp.prev = None
        return temp

    def _merge(self, first, second, key_func, reverse):
        if not first: return second
        if not second: return first
        
        val1 = key_func(first.song)
        val2 = key_func(second.song)
        
        condition = (val1 > val2) if reverse else (val1 < val2)
        
        if condition:
            first.next = self._merge(first.next, second, key_func, reverse)
            if first.next: first.next.prev = first
            first.prev = None
            return first
        else:
            second.next = self._merge(first, second.next, key_func, reverse)
            if second.next: second.next.prev = second
            second.prev = None
            return second

    def _rebuild_links(self):
        # Rebuild prev pointers and tail after merge sort
        curr = self.head
        prev = None
        self.size = 0
        while curr:
            self.size += 1
            curr.prev = prev
            prev = curr
            curr = curr.next
        self.tail = prev
        # Reset current to head if it's lost or just to be safe
        self.current = self.head
