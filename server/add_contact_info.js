const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function addContactInfoToExistingProducts() {
  try {
    console.log('Fetching products without contact information...')
    
    // Get all products that don't have contact_info
    const { data: products, error: fetchError } = await supabase
      .from('products')
      .select('product_id, title, artisan_id')
      .is('contact_info', null)
    
    if (fetchError) {
      throw fetchError
    }
    
    console.log(`Found ${products.length} products without contact information`)
    
    if (products.length === 0) {
      console.log('All products already have contact information!')
      return
    }
    
    // Get artisan information for these products
    const artisanIds = [...new Set(products.map(p => p.artisan_id))]
    const { data: artisans, error: artisanError } = await supabase
      .from('profiles')
      .select('id, name, email')
      .in('id', artisanIds)
    
    if (artisanError) {
      throw artisanError
    }
    
    const artisanMap = new Map(artisans.map(a => [a.id, a]))
    
    // Update products with default contact information
    const updates = products.map(product => {
      const artisan = artisanMap.get(product.artisan_id)
      const defaultContact = artisan 
        ? `Contact: ${artisan.name} (${artisan.email})`
        : 'Contact information not available'
      
      return {
        product_id: product.product_id,
        contact_info: defaultContact
      }
    })
    
    console.log('Updating products with contact information...')
    
    // Update products in batches
    const batchSize = 10
    for (let i = 0; i < updates.length; i += batchSize) {
      const batch = updates.slice(i, i + batchSize)
      
      for (const update of batch) {
        const { error: updateError } = await supabase
          .from('products')
          .update({ contact_info: update.contact_info })
          .eq('product_id', update.product_id)
        
        if (updateError) {
          console.error(`Error updating product ${update.product_id}:`, updateError)
        } else {
          console.log(`✓ Updated product: ${update.product_id}`)
        }
      }
    }
    
    console.log(`\n✅ Successfully updated ${updates.length} products with contact information!`)
    
    // Verify the updates
    const { data: updatedProducts, error: verifyError } = await supabase
      .from('products')
      .select('product_id, title, contact_info')
      .not('contact_info', 'is', null)
    
    if (verifyError) {
      console.error('Error verifying updates:', verifyError)
    } else {
      console.log(`\n📊 Verification: ${updatedProducts.length} products now have contact information`)
    }
    
  } catch (error) {
    console.error('Error adding contact information:', error)
    process.exit(1)
  }
}

// Run the script
addContactInfoToExistingProducts()
