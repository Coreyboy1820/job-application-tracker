import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { createHandler } from './handler.ts'

Deno.serve(createHandler({
  env: (name) => Deno.env.get(name),
  resolveDns: (host, type) => Deno.resolveDns(host, type),
  fetch,
  createClient: (url, key, authorization) => {
    const client = createClient(url, key, { global: { headers: { Authorization: authorization } } })
    return {
      loadApplication: async (id) => {
        const { data, error } = await client.from('applications')
          .select('id, company, role, url, skills_source_url, skills_analyzed_at, interview_questions_version, skill_extraction_version, job_description, skills')
          .eq('id', id).single()
        return error ? null : data
      },
      readQuestions: async (keys) => {
        const { data, error } = await client.from('skill_interview_questions').select('skill_key, questions').in('skill_key', keys)
        if (error) throw new Error('Could not load saved interview questions. Please retry.')
        return data ?? []
      },
      storeQuestions: async (rows) => {
        const { error } = await client.from('skill_interview_questions').upsert(rows, { onConflict: 'user_id,skill_key', ignoreDuplicates: true })
        if (error) throw new Error('Interview questions were generated, but could not be saved for reuse. Please retry.')
      },
      saveApplication: async (id, updates) => {
        const { error } = await client.from('applications').update(updates).eq('id', id)
        if (error) throw new Error('Skills were found, but could not be saved to the application. Please retry.')
      },
    }
  },
}))
