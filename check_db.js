
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data, error } = await supabase
    .from('machine_types')
    .select('id, nome, is_attachment');
  
  if (error) {
    console.error(error);
    return;
  }
  
  console.log('Machine Types:');
  console.table(data);
  
  const { data: machines, error: mError } = await supabase
    .from('machines')
    .select('id, unit_number, machine_type_id');
    
  if (mError) {
    console.error(mError);
    return;
  }
  
  console.log('\nMachines:');
  console.table(machines.slice(0, 10));
}

check();
