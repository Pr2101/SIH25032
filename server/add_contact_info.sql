-- Add contact information to existing products that don't have it
-- This script will add default contact information based on artisan profile data

-- First, let's see how many products need contact information
SELECT COUNT(*) as products_without_contact 
FROM public.products 
WHERE contact_info IS NULL;

-- Update products with contact information from artisan profiles
UPDATE public.products 
SET contact_info = CONCAT('Contact: ', p.name, ' (', p.email, ')')
FROM public.profiles p
WHERE public.products.artisan_id = p.id 
  AND public.products.contact_info IS NULL;

-- For products where we couldn't get artisan info, add a default message
UPDATE public.products 
SET contact_info = 'Contact information not available - please contact the artisan directly'
WHERE contact_info IS NULL;

-- Verify the updates
SELECT 
  COUNT(*) as total_products,
  COUNT(contact_info) as products_with_contact,
  COUNT(*) - COUNT(contact_info) as products_without_contact
FROM public.products;

-- Show some examples of updated products
SELECT 
  product_id,
  title,
  contact_info,
  created_at
FROM public.products 
WHERE contact_info IS NOT NULL
ORDER BY created_at DESC
LIMIT 5;
