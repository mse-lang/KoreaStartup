const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf-8');
const url = env.match(/NEXT_PUBLIC_SUPABASE_URL="([^"]+)"/)[1];
const key = env.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY="([^"]+)"/)[1];
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(url, key);

async function main() {
  const { data, error } = await supabase
    .from('articles')
    .select('id, title, source_name, content_raw')
    .order('created_at', { ascending: false })
    .limit(30);

  if (error) {
    console.error('ERR:', error.message);
    process.exit(1);
  }

  const output = [];
  for (const a of data) {
    const len = a.content_raw ? a.content_raw.length : 0;
    output.push(a.title.substring(0, 45) + ' | ' + a.source_name + ' | LEN=' + len);
  }
  fs.writeFileSync('tmp_lengths.txt', output.join('\n'), 'utf-8');
  console.log('Written to tmp_lengths.txt');
  process.exit(0);
}

main();
