-- Migración para el control de acceso en contratos por parte de dueños de propiedades (landlord y company)
-- Permite que los dueños de las propiedades vinculadas a un contrato puedan ver y actualizar dichos contratos.

CREATE POLICY "Listing owners can view contracts" ON "public"."contracts"
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.listings l
      WHERE l.id = contracts.listing_id AND l.user_id = auth.uid()
    )
  );

CREATE POLICY "Listing owners can update contracts" ON "public"."contracts"
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.listings l
      WHERE l.id = contracts.listing_id AND l.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.listings l
      WHERE l.id = contracts.listing_id AND l.user_id = auth.uid()
    )
  );
