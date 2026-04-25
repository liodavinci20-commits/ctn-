import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://hfillvzdesjvyhhmgjgc.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhmaWxsdnpkZXNqdnloaG1namdjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcxMzkyODYsImV4cCI6MjA5MjcxNTI4Nn0.DnrhGI2967n-fI-gcW4iayfWtMSdZYhPRURUCeBj0kU';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
