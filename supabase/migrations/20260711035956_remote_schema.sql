-- Baseline schema snapshot, generado con `supabase db pull` el 11 de julio,
-- 2026 (ver antigravity_rules.md sección 4.A0). Antes de esto no existía
-- ninguna carpeta supabase/migrations/ — el remoto tenía 6 migraciones
-- huérfanas de mayo 2026 que nunca llegaron a este repo. Este archivo es
-- solo DDL (sin datos) y captura el estado real de la base al momento del
-- pull, incluyendo cosas que ya existían pero no estaban documentadas en
-- ningún lado versionado (ej. la función is_admin(uuid) y sus políticas).

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."delete_user"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'auth'
    AS $$
DECLARE
  current_user_id uuid;
BEGIN
  current_user_id := auth.uid();
  
  IF current_user_id IS NOT NULL THEN
    -- Delete user's messages (both sent and received)
    DELETE FROM public.messages WHERE sender_id = current_user_id OR receiver_id = current_user_id;
    
    -- Delete user's matches
    DELETE FROM public.matches WHERE user1 = current_user_id OR user2 = current_user_id;
    
    -- Delete user's swipes (both as swiper and swiped)
    DELETE FROM public.swipes WHERE swiper = current_user_id OR swiped = current_user_id;
    
    -- Delete user's listings
    DELETE FROM public.listings WHERE user_id = current_user_id;
    
    -- Delete user's verifications
    DELETE FROM public.verifications WHERE user_id = current_user_id;
    
    -- Delete user's blocks
    DELETE FROM public.user_blocks WHERE blocker_id = current_user_id OR blocked_id = current_user_id;
    
    -- Delete user's reports
    DELETE FROM public.user_reports WHERE reporter_id = current_user_id OR reported_id = current_user_id;
    
    -- Delete user's contract participants
    DELETE FROM public.contract_participants WHERE user_id = current_user_id;
    
    -- Delete user's contracts
    DELETE FROM public.contracts WHERE initiator_id = current_user_id;
    
    -- Delete user's profile
    DELETE FROM public.profiles WHERE id = current_user_id;
    
    -- Delete the user from auth.users
    DELETE FROM auth.users WHERE id = current_user_id;
  END IF;
END;
$$;


ALTER FUNCTION "public"."delete_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_admin"("user_id" "uuid") RETURNS boolean
    LANGUAGE "sql" SECURITY DEFINER
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = user_id AND role = 'admin'
  );
$$;


ALTER FUNCTION "public"."is_admin"("user_id" "uuid") OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."contract_participants" (
    "contract_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL
);


ALTER TABLE "public"."contract_participants" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."contracts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "initiator_id" "uuid",
    "listing_id" "uuid",
    "type" "text" NOT NULL,
    "status" "text" DEFAULT 'draft'::"text" NOT NULL,
    "template_version" "text",
    "clauses" "jsonb" DEFAULT '{}'::"jsonb",
    "selected_custom_clauses" "text"[] DEFAULT '{}'::"text"[],
    "pdf_url" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "effective_date" "date",
    "termination_date" "date"
);


ALTER TABLE "public"."contracts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."listings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "title" "text",
    "description" "text",
    "price" integer,
    "location" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "images" "text"[] DEFAULT '{}'::"text"[],
    "utilities_included" boolean DEFAULT false,
    "status" "text" DEFAULT 'available'::"text",
    "address" "text",
    "is_property_verified" boolean DEFAULT false,
    "latitude" double precision,
    "longitude" double precision
);


ALTER TABLE "public"."listings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."matches" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user1" "uuid",
    "user2" "uuid",
    "status" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."matches" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."messages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "match_id" "uuid",
    "sender_id" "uuid",
    "content" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "receiver_id" "uuid",
    "media_url" "text",
    "media_type" "text",
    "reply_to_id" "uuid",
    "is_read" boolean DEFAULT false
);


ALTER TABLE "public"."messages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "age" integer,
    "bio" "text",
    "photoUrl" "text",
    "likes" "text",
    "preferences" "text",
    "dealbreakers" "text",
    "latOffset" double precision,
    "lngOffset" double precision,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "lifestyle" "jsonb" DEFAULT '{}'::"jsonb",
    "role" "text" DEFAULT 'seeker'::"text",
    "trust_score" integer DEFAULT 20,
    "risk_level" "text" DEFAULT 'low'::"text",
    "is_identity_verified" boolean DEFAULT false,
    "is_university_verified" boolean DEFAULT false,
    "is_workplace_verified" boolean DEFAULT false,
    "is_income_verified" boolean DEFAULT false,
    "latitude" double precision,
    "longitude" double precision,
    "push_token" "text",
    "is_social_verified" boolean DEFAULT false,
    "availability_status" character varying(50) DEFAULT 'exploring'::character varying,
    "photos" "text"[] DEFAULT '{}'::"text"[],
    "is_phone_verified" boolean DEFAULT false,
    "is_background_verified" boolean DEFAULT false,
    "is_references_verified" boolean DEFAULT false,
    "is_public" boolean DEFAULT true,
    "read_receipts_enabled" boolean DEFAULT true,
    "share_badges_enabled" boolean DEFAULT true,
    "biometric_enabled" boolean DEFAULT false,
    CONSTRAINT "profiles_risk_level_check" CHECK (("risk_level" = ANY (ARRAY['low'::"text", 'medium'::"text", 'high'::"text", 'critical'::"text"])))
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."swipes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "swiper" "uuid" NOT NULL,
    "swiped" "uuid" NOT NULL,
    "liked" boolean NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."swipes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_blocks" (
    "blocker_id" "uuid" NOT NULL,
    "blocked_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."user_blocks" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_reports" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "reporter_id" "uuid",
    "reported_id" "uuid",
    "reason" "text" NOT NULL,
    "description" "text",
    "status" "text" DEFAULT 'open'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "user_reports_status_check" CHECK (("status" = ANY (ARRAY['open'::"text", 'investigating'::"text", 'resolved'::"text", 'dismissed'::"text"])))
);


ALTER TABLE "public"."user_reports" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."verifications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "type" "text" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text",
    "document_url" "text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "verifications_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'approved'::"text", 'rejected'::"text"]))),
    CONSTRAINT "verifications_type_check" CHECK (("type" = ANY (ARRAY['identity'::"text", 'university'::"text", 'workplace'::"text", 'income'::"text", 'property'::"text"])))
);


ALTER TABLE "public"."verifications" OWNER TO "postgres";


ALTER TABLE ONLY "public"."contract_participants"
    ADD CONSTRAINT "contract_participants_pkey" PRIMARY KEY ("contract_id", "user_id");



ALTER TABLE ONLY "public"."contracts"
    ADD CONSTRAINT "contracts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."listings"
    ADD CONSTRAINT "listings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."matches"
    ADD CONSTRAINT "matches_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."swipes"
    ADD CONSTRAINT "swipes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."swipes"
    ADD CONSTRAINT "swipes_swiper_swiped_key" UNIQUE ("swiper", "swiped");



ALTER TABLE ONLY "public"."user_blocks"
    ADD CONSTRAINT "user_blocks_pkey" PRIMARY KEY ("blocker_id", "blocked_id");



ALTER TABLE ONLY "public"."user_reports"
    ADD CONSTRAINT "user_reports_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."verifications"
    ADD CONSTRAINT "verifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."contract_participants"
    ADD CONSTRAINT "contract_participants_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "public"."contracts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."contract_participants"
    ADD CONSTRAINT "contract_participants_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."contracts"
    ADD CONSTRAINT "contracts_initiator_id_fkey" FOREIGN KEY ("initiator_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."contracts"
    ADD CONSTRAINT "contracts_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."listings"
    ADD CONSTRAINT "listings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_receiver_id_fkey" FOREIGN KEY ("receiver_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_reply_to_id_fkey" FOREIGN KEY ("reply_to_id") REFERENCES "public"."messages"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."swipes"
    ADD CONSTRAINT "swipes_swiped_fkey" FOREIGN KEY ("swiped") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."swipes"
    ADD CONSTRAINT "swipes_swiper_fkey" FOREIGN KEY ("swiper") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_blocks"
    ADD CONSTRAINT "user_blocks_blocked_id_fkey" FOREIGN KEY ("blocked_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_blocks"
    ADD CONSTRAINT "user_blocks_blocker_id_fkey" FOREIGN KEY ("blocker_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_reports"
    ADD CONSTRAINT "user_reports_reported_id_fkey" FOREIGN KEY ("reported_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_reports"
    ADD CONSTRAINT "user_reports_reporter_id_fkey" FOREIGN KEY ("reporter_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."verifications"
    ADD CONSTRAINT "verifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



CREATE POLICY "Admins can delete all contracts" ON "public"."contracts" FOR DELETE USING ("public"."is_admin"("auth"."uid"()));



CREATE POLICY "Admins can delete all listings" ON "public"."listings" FOR DELETE USING ("public"."is_admin"("auth"."uid"()));



CREATE POLICY "Admins can select all user_reports" ON "public"."user_reports" FOR SELECT USING ("public"."is_admin"("auth"."uid"()));



CREATE POLICY "Admins can select all verifications" ON "public"."verifications" FOR SELECT USING ("public"."is_admin"("auth"."uid"()));



CREATE POLICY "Admins can update all contracts" ON "public"."contracts" FOR UPDATE USING ("public"."is_admin"("auth"."uid"())) WITH CHECK ("public"."is_admin"("auth"."uid"()));



CREATE POLICY "Admins can update all listings" ON "public"."listings" FOR UPDATE USING ("public"."is_admin"("auth"."uid"()));



CREATE POLICY "Admins can update all profiles" ON "public"."profiles" FOR UPDATE USING ("public"."is_admin"("auth"."uid"()));



CREATE POLICY "Admins can update all user_reports" ON "public"."user_reports" FOR UPDATE USING ("public"."is_admin"("auth"."uid"()));



CREATE POLICY "Admins can update all verifications" ON "public"."verifications" FOR UPDATE USING ("public"."is_admin"("auth"."uid"()));



CREATE POLICY "Admins can view all contracts" ON "public"."contracts" FOR SELECT USING ("public"."is_admin"("auth"."uid"()));



CREATE POLICY "Admins can view all matches" ON "public"."matches" FOR SELECT USING ("public"."is_admin"("auth"."uid"()));



CREATE POLICY "Admins can view all swipes" ON "public"."swipes" FOR SELECT USING ("public"."is_admin"("auth"."uid"()));



CREATE POLICY "Authenticated users can insert contract participants" ON "public"."contract_participants" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Authenticated users can read contract participants" ON "public"."contract_participants" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Public profiles are viewable by everyone." ON "public"."profiles" FOR SELECT USING (true);



CREATE POLICY "Users can create contracts" ON "public"."contracts" FOR INSERT WITH CHECK (("auth"."uid"() = "initiator_id"));



CREATE POLICY "Users can delete messages they sent" ON "public"."messages" FOR DELETE TO "authenticated" USING (("auth"."uid"() = "sender_id"));



CREATE POLICY "Users can insert reports" ON "public"."user_reports" FOR INSERT WITH CHECK (("auth"."uid"() = "reporter_id"));



CREATE POLICY "Users can insert their own profile." ON "public"."profiles" FOR INSERT WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "Users can insert their own swipes" ON "public"."swipes" FOR INSERT WITH CHECK (("auth"."uid"() = "swiper"));



CREATE POLICY "Users can insert their own verifications" ON "public"."verifications" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can manage their blocks" ON "public"."user_blocks" USING (("auth"."uid"() = "blocker_id"));



CREATE POLICY "Users can read their own messages" ON "public"."messages" FOR SELECT TO "authenticated" USING ((("auth"."uid"() = "sender_id") OR ("auth"."uid"() = "receiver_id")));



CREATE POLICY "Users can send messages" ON "public"."messages" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "sender_id"));



CREATE POLICY "Users can update own profile." ON "public"."profiles" FOR UPDATE USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can update their own contracts" ON "public"."contracts" FOR UPDATE TO "authenticated" USING ((("auth"."uid"() = "initiator_id") OR (EXISTS ( SELECT 1
   FROM "public"."contract_participants" "cp"
  WHERE (("cp"."contract_id" = "contracts"."id") AND ("cp"."user_id" = "auth"."uid"()))))));



CREATE POLICY "Users can update their own messages" ON "public"."messages" FOR UPDATE TO "authenticated" USING ((("auth"."uid"() = "sender_id") OR ("auth"."uid"() = "receiver_id"))) WITH CHECK ((("auth"."uid"() = "sender_id") OR ("auth"."uid"() = "receiver_id")));



CREATE POLICY "Users can view their own contracts" ON "public"."contracts" FOR SELECT TO "authenticated" USING ((("auth"."uid"() = "initiator_id") OR (EXISTS ( SELECT 1
   FROM "public"."contract_participants" "cp"
  WHERE (("cp"."contract_id" = "contracts"."id") AND ("cp"."user_id" = "auth"."uid"()))))));



CREATE POLICY "Users can view their own reports" ON "public"."user_reports" FOR SELECT USING (("auth"."uid"() = "reporter_id"));



CREATE POLICY "Users can view their own swipes" ON "public"."swipes" FOR SELECT USING ((("auth"."uid"() = "swiper") OR ("auth"."uid"() = "swiped")));



CREATE POLICY "Users can view their own verifications" ON "public"."verifications" FOR SELECT USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."contract_participants" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."contracts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."listings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."matches" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."messages" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."swipes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_blocks" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_reports" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "users can create matches" ON "public"."matches" FOR INSERT TO "authenticated" WITH CHECK ((("auth"."uid"() = "user1") OR ("auth"."uid"() = "user2")));



CREATE POLICY "users can create their own listings" ON "public"."listings" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "users can delete their own listings" ON "public"."listings" FOR DELETE TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "users can send messages" ON "public"."messages" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "sender_id"));



CREATE POLICY "users can update their own listings" ON "public"."listings" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "users can view all listings" ON "public"."listings" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "users can view messages in their matches" ON "public"."messages" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."matches"
  WHERE (("matches"."id" = "messages"."match_id") AND (("auth"."uid"() = "matches"."user1") OR ("auth"."uid"() = "matches"."user2"))))));



CREATE POLICY "users can view their matches" ON "public"."matches" FOR SELECT TO "authenticated" USING ((("auth"."uid"() = "user1") OR ("auth"."uid"() = "user2")));



ALTER TABLE "public"."verifications" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";






ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."contracts";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."messages";



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";






















































































































































GRANT ALL ON FUNCTION "public"."delete_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."delete_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."delete_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_admin"("user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_admin"("user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_admin"("user_id" "uuid") TO "service_role";


















GRANT ALL ON TABLE "public"."contract_participants" TO "anon";
GRANT ALL ON TABLE "public"."contract_participants" TO "authenticated";
GRANT ALL ON TABLE "public"."contract_participants" TO "service_role";



GRANT ALL ON TABLE "public"."contracts" TO "anon";
GRANT ALL ON TABLE "public"."contracts" TO "authenticated";
GRANT ALL ON TABLE "public"."contracts" TO "service_role";



GRANT ALL ON TABLE "public"."listings" TO "anon";
GRANT ALL ON TABLE "public"."listings" TO "authenticated";
GRANT ALL ON TABLE "public"."listings" TO "service_role";



GRANT ALL ON TABLE "public"."matches" TO "anon";
GRANT ALL ON TABLE "public"."matches" TO "authenticated";
GRANT ALL ON TABLE "public"."matches" TO "service_role";



GRANT ALL ON TABLE "public"."messages" TO "anon";
GRANT ALL ON TABLE "public"."messages" TO "authenticated";
GRANT ALL ON TABLE "public"."messages" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."swipes" TO "anon";
GRANT ALL ON TABLE "public"."swipes" TO "authenticated";
GRANT ALL ON TABLE "public"."swipes" TO "service_role";



GRANT ALL ON TABLE "public"."user_blocks" TO "anon";
GRANT ALL ON TABLE "public"."user_blocks" TO "authenticated";
GRANT ALL ON TABLE "public"."user_blocks" TO "service_role";



GRANT ALL ON TABLE "public"."user_reports" TO "anon";
GRANT ALL ON TABLE "public"."user_reports" TO "authenticated";
GRANT ALL ON TABLE "public"."user_reports" TO "service_role";



GRANT ALL ON TABLE "public"."verifications" TO "anon";
GRANT ALL ON TABLE "public"."verifications" TO "authenticated";
GRANT ALL ON TABLE "public"."verifications" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































