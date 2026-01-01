import unittest
from adt import Playlist, Song

class TestPlaylistADT(unittest.TestCase):
    def setUp(self):
        self.playlist = Playlist()
        self.s1 = Song("Title1", "Artist1", "path1")
        self.s2 = Song("Title2", "Artist2", "path2")
        self.s3 = Song("Title3", "Artist3", "path3")

    def test_add_song(self):
        self.playlist.add_song(self.s1)
        self.assertEqual(self.playlist.size, 1)
        self.assertEqual(self.playlist.head.song.title, "Title1")
        self.assertEqual(self.playlist.tail.song.title, "Title1")

        self.playlist.add_song(self.s2)
        self.assertEqual(self.playlist.size, 2)
        self.assertEqual(self.playlist.head.next.song.title, "Title2")
        self.assertEqual(self.playlist.tail.song.title, "Title2")

    def test_navigation(self):
        self.playlist.add_song(self.s1)
        self.playlist.add_song(self.s2)
        
        # Current should be s1 initially (head)
        self.assertEqual(self.playlist.get_current_song().title, "Title1")
        
        # Next
        self.assertEqual(self.playlist.next_song().title, "Title2")
        
        # Next at end (should stay)
        self.assertEqual(self.playlist.next_song().title, "Title2")
        
        # Prev
        self.assertEqual(self.playlist.prev_song().title, "Title1")

    def test_remove_song(self):
        self.playlist.add_song(self.s1)
        self.playlist.add_song(self.s2)
        self.playlist.add_song(self.s3)
        
        # Remove middle
        self.playlist.remove_song(self.s2.id)
        self.assertEqual(self.playlist.size, 2)
        self.assertEqual(self.playlist.head.next.song.title, "Title3")
        
        # Remove head
        self.playlist.remove_song(self.s1.id)
        self.assertEqual(self.playlist.size, 1)
        self.assertEqual(self.playlist.head.song.title, "Title3")

    def test_shuffle(self):
        for i in range(10):
            self.playlist.add_song(Song(f"T{i}", f"A{i}", ""))
        
        original_order = [s['title'] for s in self.playlist.get_all_songs()]
        self.playlist.shuffle()
        new_order = [s['title'] for s in self.playlist.get_all_songs()]
        
        self.assertNotEqual(original_order, new_order)
        self.assertEqual(len(new_order), 10)
    
    def test_is_empty(self):
        # Test empty playlist
        self.assertTrue(self.playlist.is_empty())
        
        # Add a song and test
        self.playlist.add_song(self.s1)
        self.assertFalse(self.playlist.is_empty())
        
        # Remove the song and test
        self.playlist.remove_song(self.s1.id)
        self.assertTrue(self.playlist.is_empty())
    
    def test_contains_song(self):
        # Test empty playlist
        self.assertFalse(self.playlist.contains_song("path1"))
        
        # Add a song and test
        self.playlist.add_song(self.s1)
        self.assertTrue(self.playlist.contains_song("path1"))
        
        # Test with different path
        self.assertFalse(self.playlist.contains_song("path2"))
        
        # Add another song and test
        self.playlist.add_song(self.s2)
        self.assertTrue(self.playlist.contains_song("path1"))
        self.assertTrue(self.playlist.contains_song("path2"))

if __name__ == '__main__':
    unittest.main()
