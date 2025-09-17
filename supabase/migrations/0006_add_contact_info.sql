-- Add contact information to products table
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS contact_info TEXT;

-- Add comment for clarity
COMMENT ON COLUMN public.products.contact_info IS 'Contact information for the artisan (phone, email, social media, etc.)';

-- Update RLS policy to allow artisans to update contact info
DROP POLICY IF EXISTS "artisans_can_update_own_products" ON public.products;
CREATE POLICY "artisans_can_update_own_products" ON public.products
  FOR UPDATE USING (auth.uid() = artisan_id)
  WITH CHECK (auth.uid() = artisan_id);
