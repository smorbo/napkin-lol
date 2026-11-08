CREATE POLICY "Anyone can upload room images" ON storage.objects
  FOR INSERT TO anon, authenticated
  WITH CHECK (bucket_id = 'room-uploads');
CREATE POLICY "Anyone can read room images" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'room-uploads');