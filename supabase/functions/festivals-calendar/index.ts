import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// This function doesn't require authentication since it's fetching public festival data

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
}

serve(async (req) => {
  console.log('[festivals-calendar] Request received:', req.method, req.url)
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('[festivals-calendar] Handling OPTIONS request')
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = await req.json()
    console.log('[festivals-calendar] Request body:', body)
    
    const { state } = body
    
    if (!state) {
      console.log('[festivals-calendar] Missing state parameter')
      return new Response(
        JSON.stringify({ error: 'State parameter is required' }),
        { status: 400, headers: corsHeaders }
      )
    }

    console.log('[festivals-calendar] Processing festivals for state:', state)

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY')

    if (!geminiApiKey) {
      return new Response(
        JSON.stringify({ error: 'GEMINI_API_KEY missing' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Check if we have cached festival data for this state
    const { data: cachedFestivals } = await supabase
      .from('festivals')
      .select('*')
      .eq('state', state)
      .order('festival_date', { ascending: true })

    if (cachedFestivals && cachedFestivals.length > 0) {
      console.log(`[festivals-calendar] Returning ${cachedFestivals.length} cached festivals for ${state}`)
      return new Response(
        JSON.stringify({ festivals: cachedFestivals, cached: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Fetch festival data from Wikipedia and process with Gemini
    const festivals = await fetchAndProcessFestivals(state, geminiApiKey)

    // If no festivals from API, return some basic festivals for the state
    if (festivals.length === 0) {
      console.log(`[festivals-calendar] No festivals from API, returning basic festivals for ${state}`)
      const basicFestivals = getBasicFestivalsForState(state)
      
      return new Response(
        JSON.stringify({ festivals: basicFestivals, cached: false, fallback: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Store in database
    if (festivals.length > 0) {
      const { error: insertError } = await supabase
        .from('festivals')
        .upsert(festivals.map(festival => ({
          ...festival,
          state,
          created_at: new Date().toISOString()
        })), { onConflict: 'name,state' })

      if (insertError) {
        console.error('[festivals-calendar] Error inserting festivals:', insertError)
      } else {
        console.log(`[festivals-calendar] Inserted ${festivals.length} festivals for ${state}`)
      }
    }

    return new Response(
      JSON.stringify({ festivals, cached: false }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('[festivals-calendar] Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

async function fetchAndProcessFestivals(state: string, geminiApiKey: string) {
  try {
    // Create a comprehensive prompt for Gemini
    const currentDate = new Date()
    const currentYear = currentDate.getFullYear()
    
    const prompt = `
You are a cultural expert specializing in Indian festivals and traditions. I need you to provide a comprehensive list of festivals celebrated in ${state}, India.

Please provide the information in the following JSON format:
[
  {
    "name": "Festival Name",
    "description": "Brief description of the festival",
    "festival_date": "YYYY-MM-DD",
    "duration_days": 1,
    "significance": "Why this festival is important",
    "traditions": ["tradition1", "tradition2"],
    "estimated_date": false
  }
]

IMPORTANT REQUIREMENTS:
1. Include both major and regional festivals specific to ${state}
2. For festivals with fixed dates, use the actual date for ${currentYear}
3. For festivals with lunar/religious calendars, provide the estimated date for ${currentYear}
4. If you cannot determine the exact date, set "estimated_date": true and provide your best estimate
5. Sort festivals by proximity to today's date (${currentDate.toISOString().split('T')[0]})
6. Include at least 10-15 festivals
7. Focus on festivals that are still actively celebrated
8. Include both religious and cultural festivals

Examples of festivals to include:
- Major Hindu festivals (Diwali, Holi, Dussehra, etc.)
- Regional festivals specific to ${state}
- Harvest festivals
- Cultural and folk festivals
- Religious festivals of other communities
- Seasonal celebrations

Please provide accurate, culturally sensitive information.
`

    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${geminiApiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: prompt
            }]
          }],
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 2048,
          }
        })
      }
    )

    if (!geminiResponse.ok) {
      if (geminiResponse.status === 429) {
        console.log('[festivals-calendar] Gemini API rate limit hit, returning empty array')
        return []
      }
      throw new Error(`Gemini API error: ${geminiResponse.status}`)
    }

    const geminiData = await geminiResponse.json()
    const responseText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text

    if (!responseText) {
      throw new Error('No response from Gemini')
    }

    // Parse the JSON response
    let festivals
    try {
      // Remove any markdown formatting
      const cleanText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      festivals = JSON.parse(cleanText)
    } catch (parseError) {
      console.error('[festivals-calendar] JSON parse error:', parseError)
      console.error('[festivals-calendar] Raw response:', responseText)
      throw new Error('Failed to parse Gemini response as JSON')
    }

    // Validate and clean the festival data
    const validFestivals = festivals
      .filter(festival => festival.name && festival.description)
      .map(festival => ({
        name: festival.name.trim(),
        description: festival.description.trim(),
        festival_date: festival.festival_date || null,
        duration_days: festival.duration_days || 1,
        significance: festival.significance || '',
        traditions: Array.isArray(festival.traditions) ? festival.traditions : [],
        estimated_date: festival.estimated_date || false,
        gemini_processed: true
      }))

    console.log(`[festivals-calendar] Processed ${validFestivals.length} festivals for ${state}`)
    return validFestivals

  } catch (error) {
    console.error('[festivals-calendar] Error fetching festivals:', error)
    
    // Return empty array if API fails
    return []
  }
}

