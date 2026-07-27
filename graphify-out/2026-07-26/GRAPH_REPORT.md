# Graph Report - roommatefinder-app  (2026-07-26)

## Corpus Check
- 208 files · ~268,612 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1085 nodes · 1741 edges · 147 communities (78 shown, 69 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 4 edges (avg confidence: 0.57)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `0d97d464`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- supabase.ts
- mappers.ts
- expo
- icon-symbol.tsx
- scripts
- trust/index.tsx
- YardiIntegrationProvider
- preferences.tsx
- test-yardi-integration.ts
- useAdminTheme
- collapsible.tsx
- YardiApiClient
- IPmsIntegrationProvider
- useTranslation
- inbox.tsx
- LanguageContext.tsx
- ExploreMapView.tsx
- AdminThemeContext.tsx
- chat/[id].tsx
- app/_layout.tsx
- profile/[id].tsx
- new.tsx
- reports.tsx
- myprofile.tsx
- dependencies
- users.tsx
- database.types.ts
- include
- listings.tsx
- filters.tsx
- Profile
- generate_sql.js
- reset-project.js
- useExplore.ts
- ExploreHeader.tsx
- lib/types.ts
- seed_profile_photos.js
- ZumperFeedGenerator
- (tabs)/_layout.tsx
- test_yardi.ts
- compilerOptions
- seed_all_unique_apartment_photos.js
- seed_all_unique_photos.js
- seed_apartments.js
- cors.ts
- (admin)/contracts.tsx
- (admin)/index.tsx
- roles.tsx
- expo-router
- ExploreCard.tsx
- apartments.tsx
- (company)/index.tsx
- messages.tsx
- ChatSettingsModal.tsx
- ImageViewerModal.tsx
- LocationAutocomplete.tsx
- generate_listing_seeds.js
- test_msg.js
- verify_rls_anon.mjs
- applications.tsx
- (company)/contracts.tsx
- ChatHeader.tsx
- ChatHeader.tsx
- mockData.ts
- get_profiles.js
- get_schema.js
- inspect_listings.js
- test_contracts_queries.js
- test_db.js
- test_db2.js
- test_db3.js
- test_db4.js
- test_db_cols.js
- test_db_cols2.js
- test_rpc.js
- test_update.js
- seed.mjs
- seed_more.mjs
- vercel.json
- MapComponent.web.tsx
- eslint.config.js
- signup_test.mjs
- expo
- expo-av
- expo-clipboard
- expo-constants
- expo-device
- expo-document-picker
- expo-file-system
- EditProfileModal.tsx
- expo-image
- expo-image-picker
- expo-linear-gradient
- expo-linking
- expo-location
- expo-media-library
- expo-print
- expo-router
- expo-sharing
- expo-symbols
- expo-system-ui
- @expo/vector-icons
- expo-web-browser
- html2pdf.js
- react
- react-dom
- react-leaflet
- react-native
- @react-native-async-storage/async-storage
- react-native-deck-swiper
- react-native-gesture-handler
- react-native-maps
- react-native-safe-area-context
- react-native-screens
- react-native-web
- react-native-worklets
- @react-navigation/bottom-tabs
- @shopify/flash-list
- @supabase/ssr
- @supabase/supabase-js
- @tanstack/react-query
- expo-blur
- 20260712202000_assign_super_admin.sql
- analytics.tsx
- 20260712164902_rename_phone_to_email_verification.sql
- 20260712203127_fix_profiles_privilege_escalation.sql
- @react-navigation/elements
- @react-navigation/native
- deno.json
- expo-image
- 20260726180000_add_subscriptions.sql

## God Nodes (most connected - your core abstractions)
1. `useTranslation()` - 93 edges
2. `supabase` - 55 edges
3. `expo-router` - 46 edges
4. `useAdminTheme()` - 41 edges
5. `YardiIntegrationProvider` - 25 edges
6. `YardiApiClient` - 22 edges
7. `IPmsIntegrationProvider` - 21 edges
8. `IconSymbol()` - 16 edges
9. `expo` - 15 edges
10. `YardiSyncManager` - 13 edges

## Surprising Connections (you probably didn't know these)
- `ReviewContractScreen()` --calls--> `useTranslation()`  [EXTRACTED]
  app/contracts/review.tsx → context/LanguageContext.tsx
- `SettingsScreen()` --calls--> `useTranslation()`  [EXTRACTED]
  app/settings/index.tsx → context/LanguageContext.tsx
- `TrustAndSafetyHub()` --calls--> `useTranslation()`  [EXTRACTED]
  app/trust/index.tsx → context/LanguageContext.tsx
- `ChatForwardModalProps` --references--> `Profile`  [EXTRACTED]
  components/chat/modals/ChatForwardModal.tsx → lib/types.ts
- `ExploreMapViewProps` --references--> `Profile`  [EXTRACTED]
  components/explore/ExploreMapView.tsx → lib/types.ts

## Import Cycles
- None detected.

## Communities (147 total, 69 thin omitted)

### Community 0 - "supabase.ts"
Cohesion: 0.20
Nodes (9): AssociationStats, AuditLog, Profile, ROLES, STATUSES, styles, UserStats, VERIFICATIONS (+1 more)

### Community 1 - "mappers.ts"
Cohesion: 0.17
Nodes (24): mapDocumentToYardi(), mapLeaseToYardi(), mapPropertyToYardi(), mapResidentToYardi(), mapUnitToYardi(), mapVendorToYardi(), mapWorkOrderToYardi(), mapYardiToDocument() (+16 more)

### Community 2 - "expo"
Cohesion: 0.05
Nodes (34): backgroundColor, backgroundImage, foregroundImage, monochromeImage, adaptiveIcon, edgeToEdgeEnabled, permissions, predictiveBackGestureEnabled (+26 more)

### Community 3 - "icon-symbol.tsx"
Cohesion: 0.12
Nodes (10): styles, styles, ProfileHeaderProps, styles, ProfileLifestyleDetailsProps, styles, IconMapping, IconSymbol() (+2 more)

### Community 4 - "scripts"
Cohesion: 0.06
Nodes (33): eslint, eslint-config-expo, jest, jest-expo, devDependencies, eslint, eslint-config-expo, jest (+25 more)

### Community 5 - "trust/index.tsx"
Cohesion: 0.14
Nodes (9): s, TrustAndSafetyHub(), styles, TrustAlertButton, TrustAlertModalProps, BadgeConfig, styles, TrustBadgeDetailModalProps (+1 more)

### Community 6 - "YardiIntegrationProvider"
Cohesion: 0.14
Nodes (10): PmsDocument, PmsFinancialSummary, PmsLease, PmsProperty, PmsResident, PmsUnit, PmsVendor, PmsWorkOrder (+2 more)

### Community 7 - "preferences.tsx"
Cohesion: 0.16
Nodes (15): Contract, ContractDetailScreen(), s, ManageListingScreen(), styles, DEALBREAKERS, HOBBIES, LANGUAGES (+7 more)

### Community 8 - "test-yardi-integration.ts"
Cohesion: 0.16
Nodes (9): validateConfig(), YardiApiError, YardiConfigurationError, YardiIntegrationError, YardiMappingError, YardiSyncConflictError, YardiValidationError, ConflictResolutionStrategy (+1 more)

### Community 9 - "useAdminTheme"
Cohesion: 0.40
Nodes (4): AMENITIES_LIST, Apartment, CompanyApartmentsScreen(), styles

### Community 10 - "collapsible.tsx"
Cohesion: 0.11
Nodes (23): RootLayout(), unstable_settings, ParallaxScrollView(), Props, styles, styles, ThemedText(), ThemedTextProps (+15 more)

### Community 11 - "YardiApiClient"
Cohesion: 0.20
Nodes (3): YardiApiClient, YardiConfig, YardiSyncManager

### Community 13 - "useTranslation"
Cohesion: 0.15
Nodes (12): 🏗 1. Stack Tecnológico Principal, 🔑 1B. Variables de Entorno y Secretos, 📂 2. Estructura del Proyecto (Expo Router), 🚨 3. Reglas Críticas de Desarrollo (Antigravity Rules), 🗄 4. Arquitectura de Base de Datos y Storage, 🎭 5. Sistema de Roles (Jerarquía), A0. Migraciones (a partir del 10 de julio, 2026), A. Tablas Principales (Supabase PostgreSQL) (+4 more)

### Community 14 - "inbox.tsx"
Cohesion: 0.25
Nodes (7): MyProfileScreen(), s, styles, EditProfileModalProps, styles, useMyProfile(), useUpdateProfileMutation()

### Community 15 - "LanguageContext.tsx"
Cohesion: 0.25
Nodes (6): AdminSettings(), styles, THEME_COLORS, SettingsScreen(), styles, Locale

### Community 16 - "ExploreMapView.tsx"
Cohesion: 0.16
Nodes (7): ExploreMapViewProps, styles, ChangeView(), MapView(), Marker(), styles, useMap()

### Community 17 - "AdminThemeContext.tsx"
Cohesion: 0.10
Nodes (16): AdminLayoutContent(), NAV_ITEMS, styles, AdminVerifications(), PROFILE_FLAG, styles, Verification, Application (+8 more)

### Community 18 - "chat/[id].tsx"
Cohesion: 0.05
Nodes (24): ChatScreen(), styles, TypedFlashList, ChatHeaderProps, styles, ChatInputBar(), ChatInputBarProps, styles (+16 more)

### Community 19 - "app/_layout.tsx"
Cohesion: 0.07
Nodes (34): AgreementsHubScreen(), Contract, s, FollowersScreen(), styles, PrivacyPolicyScreen(), s, AboutScreen() (+26 more)

### Community 20 - "profile/[id].tsx"
Cohesion: 0.16
Nodes (10): InboxScreen(), styles, TypedFlashList, InboxConversationItem, InboxConversationItemProps, styles, InboxMatchItem, InboxMatchItemProps (+2 more)

### Community 21 - "new.tsx"
Cohesion: 0.18
Nodes (7): ListingItem, Match, NewContractScreen(), s, ContractStepMatchesProps, Match, styles

### Community 22 - "reports.tsx"
Cohesion: 0.17
Nodes (11): AdminReports(), AuditItem, COMPLAINT_STATUSES, ContractItem, ListingItem, MatchItem, ProfileItem, Report (+3 more)

### Community 23 - "myprofile.tsx"
Cohesion: 0.24
Nodes (9): ProfileDetailScreen(), styles, HomeScreen(), Profile, styles, styles, useUserProfile(), getDistanceFromLatLonInKm() (+1 more)

### Community 24 - "dependencies"
Cohesion: 0.15
Nodes (13): expo-font, expo-haptics, expo-notifications, expo-status-bar, idnumbers, leaflet, dependencies, expo-font (+5 more)

### Community 25 - "users.tsx"
Cohesion: 0.08
Nodes (32): AdminContracts(), Contract, ContractAuditLog, ContractStats, STATUS_FILTERS, styles, AdminListings(), Listing (+24 more)

### Community 26 - "database.types.ts"
Cohesion: 0.18
Nodes (10): CompositeTypes, Constants, Database, DatabaseWithoutInternals, DefaultSchema, Enums, Json, Tables (+2 more)

### Community 27 - "include"
Cohesion: 0.13
Nodes (14): expo-env.d.ts, expo/tsconfig.base, .expo/types/**/*.ts, node_modules, scratch/**, supabase/functions/**, **/*.ts, **/*.tsx (+6 more)

### Community 28 - "listings.tsx"
Cohesion: 0.38
Nodes (4): loadConfigFromEnv(), TenantYardiData, YardiAdapter, runTests()

### Community 29 - "filters.tsx"
Cohesion: 0.25
Nodes (6): BUDGET_STEPS, DEFAULT_FILTERS, ExploreFilters, ExploreFiltersScreen(), s, _savedFilters

### Community 30 - "Profile"
Cohesion: 0.36
Nodes (6): ZumperFeedGenerator, ZumperListing, ListingRow, mapRowToZumperListing(), splitAddress(), timingSafeEqual()

### Community 31 - "generate_sql.js"
Cohesion: 0.25
Nodes (8): { createClient }, FEMALE_NAMES, fs, getThemeForUser(), MALE_NAMES, run(), supabase, THEMED_SETS

### Community 32 - "reset-project.js"
Cohesion: 0.22
Nodes (7): exampleDirPath, fs, oldDirs, path, readline, rl, root

### Community 33 - "useExplore.ts"
Cohesion: 0.30
Nodes (9): getActiveFilters(), ExploreScreen(), useDeviceLocation(), FALLBACK_COORDS, LIMITS, useExplore(), withMapCoords(), useMatches() (+1 more)

### Community 34 - "ExploreHeader.tsx"
Cohesion: 0.29
Nodes (5): ExploreHeaderProps, styles, ExploreIcon(), ExploreIconProps, styles

### Community 35 - "lib/types.ts"
Cohesion: 0.33
Nodes (3): Contract, ReviewContractScreen(), s

### Community 36 - "seed_profile_photos.js"
Cohesion: 0.29
Nodes (7): { createClient }, FEMALE_NAMES, getThemeForUser(), MALE_NAMES, seed(), supabase, THEMED_SETS

### Community 37 - "ZumperFeedGenerator"
Cohesion: 0.36
Nodes (5): GET(), baseListing, getMockZumperListings(), ZumperFeedGenerator, ZumperListing

### Community 39 - "test_yardi.ts"
Cohesion: 0.67
Nodes (3): COUNTRIES, SignUpScreen(), styles

### Community 40 - "compilerOptions"
Cohesion: 0.29
Nodes (6): compilerOptions, esModuleInterop, module, moduleResolution, skipLibCheck, target

### Community 41 - "seed_all_unique_apartment_photos.js"
Cohesion: 0.29
Nodes (5): allImages, { createClient }, supabase, themedPortfolios, uniqueImages

### Community 42 - "seed_all_unique_photos.js"
Cohesion: 0.29
Nodes (5): allUrls, { createClient }, supabase, UNIQUE_THEMED_SETS, uniqueUrls

### Community 43 - "seed_apartments.js"
Cohesion: 0.29
Nodes (5): allImages, { createClient }, supabase, themedPortfolios, uniqueImages

### Community 44 - "cors.ts"
Cohesion: 0.14
Nodes (13): ExternalListing, getMockListings(), getRealListings(), ALLOWED_ORIGINS, getCorsHeaders(), createCheckoutSession(), getSubscription(), StripeCheckoutSession (+5 more)

### Community 45 - "(admin)/contracts.tsx"
Cohesion: 0.67
Nodes (3): ACTIVE_STATUSES, styles, SubscriptionsScreen()

### Community 46 - "(admin)/index.tsx"
Cohesion: 0.17
Nodes (9): ChatForwardModalProps, styles, DbContract, DbListing, DbMatch, DbMessage, DbProfile, DbSwipe (+1 more)

### Community 48 - "expo-router"
Cohesion: 0.40
Nodes (4): ActivityItem, CompanyDashboardHome(), MetricItem, styles

### Community 49 - "ExploreCard.tsx"
Cohesion: 0.23
Nodes (9): styles, ExploreCard(), ExploreCardProps, styles, ExploreSwipeControls(), ExploreSwipeControlsProps, styles, Profile (+1 more)

### Community 50 - "apartments.tsx"
Cohesion: 0.18
Nodes (10): "public"."contract_participants", "public"."contracts", "public"."is_admin"(), "public"."listings", "public"."matches", "public"."messages", "public"."profiles", "public"."swipes" (+2 more)

### Community 51 - "(company)/index.tsx"
Cohesion: 0.07
Nodes (20): ActivityItem, styles, AdminPayments(), styles, CompanyAnalyticsScreen(), styles, TopAptItem, CompanyContractsScreen() (+12 more)

### Community 54 - "ImageViewerModal.tsx"
Cohesion: 0.40
Nodes (3): COSTA_RICA_CITIES, Props, styles

### Community 56 - "generate_listing_seeds.js"
Cohesion: 0.40
Nodes (3): { createClient }, supabase, themedPortfolios

### Community 57 - "test_msg.js"
Cohesion: 0.40
Nodes (3): envStr, supabaseKey, supabaseUrl

### Community 58 - "verify_rls_anon.mjs"
Cohesion: 0.60
Nodes (4): check(), firstId(), main(), supabase

### Community 59 - "applications.tsx"
Cohesion: 0.33
Nodes (5): AdminOverview(), RecentContract, RecentUser, Stats, styles

### Community 60 - "(company)/contracts.tsx"
Cohesion: 0.48
Nodes (6): public.handle_pms_updated_at(), public.pms_company_configs, public.pms_entity_mappings, public.pms_sync_logs, trigger_pms_company_configs_updated_at, trigger_pms_entity_mappings_updated_at

### Community 65 - "mockData.ts"
Cohesion: 0.50
Nodes (3): MOCK_PROFILES, mockCurrentUserConfig, MockProfile

### Community 80 - "vercel.json"
Cohesion: 0.50
Nodes (3): headers, outputDirectory, rewrites

### Community 86 - "expo"
Cohesion: 0.48
Nodes (6): public.handle_pms_updated_at(), public.pms_company_configs, public.pms_entity_mappings, public.pms_sync_logs, trigger_pms_company_configs_updated_at, trigger_pms_entity_mappings_updated_at

### Community 87 - "expo-av"
Cohesion: 0.40
Nodes (4): ChatThread, CompanyMessagesScreen(), styles, TEMPLATES

### Community 94 - "EditProfileModal.tsx"
Cohesion: 0.40
Nodes (4): CI, Correr localmente, Qué cubre hoy, Tests de base de datos (pgTAP)

### Community 110 - "html2pdf.js"
Cohesion: 0.33
Nodes (5): Get a fresh project, Get started, Join the community, Learn more, Welcome to your Expo app 👋

### Community 133 - "20260712202000_assign_super_admin.sql"
Cohesion: 0.60
Nodes (4): public.check_new_profile_role(), public.check_role_update(), tr_check_new_profile_role, tr_check_role_update

## Knowledge Gaps
- **441 isolated node(s):** `name`, `slug`, `version`, `orientation`, `icon` (+436 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **69 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `useTranslation()` connect `app/_layout.tsx` to `supabase.ts`, `trust/index.tsx`, `preferences.tsx`, `useAdminTheme`, `inbox.tsx`, `LanguageContext.tsx`, `AdminThemeContext.tsx`, `chat/[id].tsx`, `profile/[id].tsx`, `new.tsx`, `reports.tsx`, `myprofile.tsx`, `users.tsx`, `filters.tsx`, `useExplore.ts`, `lib/types.ts`, `expo-router`, `ExploreCard.tsx`, `(company)/index.tsx`, `applications.tsx`, `expo-av`?**
  _High betweenness centrality (0.147) - this node is a cross-community bridge._
- **Why does `AdminContracts()` connect `users.tsx` to `app/_layout.tsx`, `YardiIntegrationProvider`?**
  _High betweenness centrality (0.068) - this node is a cross-community bridge._
- **Why does `expo-router` connect `app/_layout.tsx` to `expo`, `icon-symbol.tsx`, `trust/index.tsx`, `preferences.tsx`, `collapsible.tsx`, `inbox.tsx`, `LanguageContext.tsx`, `ExploreMapView.tsx`, `AdminThemeContext.tsx`, `chat/[id].tsx`, `profile/[id].tsx`, `new.tsx`, `myprofile.tsx`, `filters.tsx`, `useExplore.ts`, `ExploreHeader.tsx`, `lib/types.ts`, `(tabs)/_layout.tsx`, `test_yardi.ts`, `(admin)/contracts.tsx`, `ExploreCard.tsx`, `(company)/index.tsx`, `applications.tsx`?**
  _High betweenness centrality (0.061) - this node is a cross-community bridge._
- **What connects `name`, `slug`, `version` to the rest of the system?**
  _441 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `expo` be split into smaller, more focused modules?**
  _Cohesion score 0.05405405405405406 - nodes in this community are weakly interconnected._
- **Should `icon-symbol.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.12105263157894737 - nodes in this community are weakly interconnected._
- **Should `scripts` be split into smaller, more focused modules?**
  _Cohesion score 0.058823529411764705 - nodes in this community are weakly interconnected._