import { createClient as createSupabaseClient } from '@supabase/supabase-js'

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  
  console.log('初始化Supabase客户端:', { 
    urlDefined: !!supabaseUrl, 
    keyDefined: !!supabaseKey,
    url: supabaseUrl
  })
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('缺少Supabase环境变量配置')
  }
  
  return createSupabaseClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  })
}

export const supabase = createClient()