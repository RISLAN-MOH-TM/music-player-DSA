import unittest
from adt import Playlist, Song
import time

class TestSorting(unittest.TestCase):
    def setUp(self):
        self.playlist = Playlist()
        self.s1 = Song("Zebra", "Artist1", "path1")
        time.sleep(0.01) # Ensure different timestamps
        self.s2 = Song("Apple", "Artist2", "path2")
        time.sleep(0.01)
        self.s3 = Song("Mango", "Artist3", "path3")

        self.playlist.add_song(self.s1) # Oldest
        self.playlist.add_song(self.s2)
        self.playlist.add_song(self.s3) # Newest

    def test_sort_by_title(self):
        self.playlist.sort_by_title()
        songs = self.playlist.get_all_songs()
        titles = [s['title'] for s in songs]
        self.assertEqual(titles, ["Apple", "Mango", "Zebra"])
        
        # Verify links
        self.assertEqual(self.playlist.head.song.title, "Apple")
        self.assertEqual(self.playlist.tail.song.title, "Zebra")

    def test_sort_by_date(self):
        # Sort by date (newest first)
        self.playlist.sort_by_date()
        songs = self.playlist.get_all_songs()
        titles = [s['title'] for s in songs]
        self.assertEqual(titles, ["Mango", "Apple", "Zebra"])
        
        # Verify links
        self.assertEqual(self.playlist.head.song.title, "Mango")
        self.assertEqual(self.playlist.tail.song.title, "Zebra")
    
    def test_sort_empty_playlist(self):
        # Create an empty playlist
        empty_playlist = Playlist()
        
        # Sorting an empty playlist should not cause errors
        empty_playlist.sort_by_title()
        empty_playlist.sort_by_date()
        
        # The playlist should remain empty
        self.assertTrue(empty_playlist.is_empty())
        self.assertEqual(len(empty_playlist.get_all_songs()), 0)

if __name__ == '__main__':
    unittest.main()
