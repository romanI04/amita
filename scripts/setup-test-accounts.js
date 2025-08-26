#!/usr/bin/env node

/**
 * Setup Test Accounts for Voice Feature Testing
 * 
 * Creates:
 * - 1 Premium user with voice profile
 * - 1 Premium user without voice profile
 * - 1 Free user with partial voice profile (2/3 samples)
 * - 1 Free user with no profile
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

const testAccounts = [
  {
    email: 'premium-with-voice@test.com',
    password: 'TestPass123!',
    name: 'Premium With Voice',
    is_premium: true,
    has_voice_profile: true,
    sample_count: 5
  },
  {
    email: 'premium-no-voice@test.com',
    password: 'TestPass123!',
    name: 'Premium No Voice',
    is_premium: true,
    has_voice_profile: false,
    sample_count: 0
  },
  {
    email: 'free-partial-voice@test.com',
    password: 'TestPass123!',
    name: 'Free Partial Voice',
    is_premium: false,
    has_voice_profile: false,
    sample_count: 2
  },
  {
    email: 'free-no-voice@test.com',
    password: 'TestPass123!',
    name: 'Free No Voice',
    is_premium: false,
    has_voice_profile: false,
    sample_count: 0
  }
]

async function setupTestAccounts() {
  console.log('🚀 Setting up test accounts for voice features...\n')
  
  for (const account of testAccounts) {
    console.log(`Creating: ${account.email}`)
    
    try {
      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: account.email,
        password: account.password,
        email_confirm: true
      })
      
      if (authError) {
        if (authError.message?.includes('already registered')) {
          console.log(`  ⚠️  User already exists, updating profile...`)
          
          // Get existing user
          const { data: { users } } = await supabase.auth.admin.listUsers()
          const existingUser = users.find(u => u.email === account.email)
          
          if (existingUser) {
            // Update profile
            const { error: updateError } = await supabase
              .from('profiles')
              .update({
                is_premium: account.is_premium,
                display_name: account.name,
                updated_at: new Date().toISOString()
              })
              .eq('id', existingUser.id)
            
            if (updateError) {
              console.error(`  ❌ Failed to update profile: ${updateError.message}`)
            } else {
              console.log(`  ✅ Profile updated`)
            }
          }
        } else {
          throw authError
        }
      } else {
        console.log(`  ✅ Auth user created`)
        
        // Update profile with premium status
        const { error: profileError } = await supabase
          .from('profiles')
          .update({
            is_premium: account.is_premium,
            display_name: account.name
          })
          .eq('id', authData.user.id)
        
        if (profileError) {
          console.error(`  ❌ Failed to update profile: ${profileError.message}`)
        } else {
          console.log(`  ✅ Profile updated with premium status: ${account.is_premium}`)
        }
        
        // Create voice profile if needed
        if (account.has_voice_profile && authData.user) {
          const voiceTraits = {
            vocabulary_diversity: 0.75,
            sentence_structure: {
              avg_length: 15,
              complexity: 'moderate'
            },
            tone: 'conversational',
            formality_level: 0.6,
            unique_phrases: ['got', 'really good', 'stuff'],
            punctuation_style: 'standard'
          }
          
          const { error: voiceError } = await supabase
            .from('voiceprints')
            .insert({
              user_id: authData.user.id,
              traits: voiceTraits,
              sample_count: account.sample_count,
              is_default: true,
              status: 'active',
              created_at: new Date().toISOString()
            })
          
          if (voiceError) {
            console.error(`  ❌ Failed to create voice profile: ${voiceError.message}`)
          } else {
            console.log(`  ✅ Voice profile created with ${account.sample_count} samples`)
          }
        }
        
        // Create sample writing samples if needed
        if (account.sample_count > 0 && authData.user) {
          for (let i = 0; i < account.sample_count; i++) {
            const sampleText = `This is sample text ${i + 1}. I got really good results from the analysis. The stuff we're working on is making solid progress. It's been a productive day overall.`
            
            const { error: sampleError } = await supabase
              .from('writing_samples')
              .insert({
                user_id: authData.user.id,
                content: sampleText,
                title: `Sample ${i + 1}`,
                ai_confidence_score: Math.random() * 30, // Low AI scores
                authenticity_score: 70 + Math.random() * 30, // High authenticity
                created_at: new Date(Date.now() - i * 86400000).toISOString() // Spread over days
              })
            
            if (sampleError) {
              console.error(`  ❌ Failed to create sample ${i + 1}: ${sampleError.message}`)
            }
          }
          
          if (account.sample_count > 0) {
            console.log(`  ✅ Created ${account.sample_count} writing samples`)
          }
        }
      }
      
      console.log(`  📧 Login: ${account.email} / ${account.password}`)
      console.log(`  💎 Premium: ${account.is_premium ? 'Yes' : 'No'}`)
      console.log(`  🎯 Voice Profile: ${account.has_voice_profile ? 'Yes' : `No (${account.sample_count}/3 samples)`}`)
      console.log()
      
    } catch (error) {
      console.error(`❌ Failed to create ${account.email}:`, error.message)
      console.log()
    }
  }
  
  console.log('\n✅ Test account setup complete!')
  console.log('\n📋 Quick Reference:')
  console.log('────────────────────────────────────────')
  testAccounts.forEach(acc => {
    console.log(`${acc.is_premium ? '💎' : '⭐'} ${acc.email}`)
    console.log(`   Password: ${acc.password}`)
    console.log(`   Features: ${acc.is_premium ? 'All premium features' : 'Free tier'}`)
    console.log(`   Voice: ${acc.has_voice_profile ? 'Complete profile' : `${acc.sample_count}/3 samples`}`)
    console.log()
  })
}

setupTestAccounts().catch(console.error)