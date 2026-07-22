# Graph Report - roommatefinder-app  (2026-07-21)

## Corpus Check
- 187 files · ~250,503 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1017 nodes · 1591 edges · 143 communities (72 shown, 71 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 4 edges (avg confidence: 0.57)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `ffc34fac`
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
- expo-blur
- expo-clipboard
- expo-constants
- expo-device
- expo-document-picker
- expo-file-system
- expo-image
- expo-image-picker
- expo-linear-gradient
- expo-linking
- expo-location
- expo-media-library
- expo-print
- expo-router
- expo-sharing
- expo-status-bar
- expo-symbols
- expo-system-ui
- @expo/vector-icons
- expo-web-browser
- html2pdf.js
- leaflet
- react
- react-dom
- react-leaflet
- react-native
- @react-native-async-storage/async-storage
- react-native-deck-swiper
- react-native-gesture-handler
- react-native-google-places-autocomplete
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
- 20260712202000_assign_super_admin.sql
- signup.tsx
- 20260712164902_rename_phone_to_email_verification.sql
- 20260712203127_fix_profiles_privilege_escalation.sql
- @react-navigation/elements
- @react-navigation/native

## God Nodes (most connected - your core abstractions)
1. `useTranslation()` - 91 edges
2. `supabase` - 54 edges
3. `expo-router` - 45 edges
4. `useAdminTheme()` - 41 edges
5. `YardiIntegrationProvider` - 25 edges
6. `YardiApiClient` - 22 edges
7. `IPmsIntegrationProvider` - 21 edges
8. `IconSymbol()` - 16 edges
9. `expo` - 14 edges
10. `YardiSyncManager` - 13 edges

## Surprising Connections (you probably didn't know these)
- `ReviewContractScreen()` --calls--> `useTranslation()`  [EXTRACTED]
  app/contracts/review.tsx → context/LanguageContext.tsx
- `BlockedUsersScreen()` --calls--> `useTranslation()`  [EXTRACTED]
  app/settings/blocked.tsx → context/LanguageContext.tsx
- `SettingsScreen()` --calls--> `useTranslation()`  [EXTRACTED]
  app/settings/index.tsx → context/LanguageContext.tsx
- `TermsScreen()` --calls--> `useTranslation()`  [EXTRACTED]
  app/terms.tsx → context/LanguageContext.tsx
- `TrustAndSafetyHub()` --calls--> `useTranslation()`  [EXTRACTED]
  app/trust/index.tsx → context/LanguageContext.tsx

## Import Cycles
- None detected.

## Communities (143 total, 71 thin omitted)

### Community 0 - "supabase.ts"
Cohesion: 0.11
Nodes (16): AgreementsHubScreen(), Contract, s, FollowersScreen(), styles, AboutScreen(), styles, HelpScreen() (+8 more)

### Community 1 - "mappers.ts"
Cohesion: 0.12
Nodes (10): YardiDocument, YardiFinancialSummary, YardiLease, YardiProperty, YardiResident, YardiSoapResponse, YardiTransaction, YardiUnit (+2 more)

### Community 2 - "expo"
Cohesion: 0.07
Nodes (29): backgroundColor, backgroundImage, foregroundImage, monochromeImage, adaptiveIcon, edgeToEdgeEnabled, permissions, predictiveBackGestureEnabled (+21 more)

### Community 3 - "icon-symbol.tsx"
Cohesion: 0.13
Nodes (10): styles, styles, ProfileHeaderProps, styles, ProfileLifestyleDetailsProps, styles, IconMapping, IconSymbol() (+2 more)

### Community 4 - "scripts"
Cohesion: 0.07
Nodes (26): eslint, eslint-config-expo, devDependencies, eslint, eslint-config-expo, patch-package, @types/leaflet, @types/react (+18 more)

### Community 5 - "trust/index.tsx"
Cohesion: 0.09
Nodes (13): s, TrustAndSafetyHub(), s, VerificationWizard(), styles, TrustAlertButton, TrustAlertModalProps, BadgeConfig (+5 more)

### Community 6 - "YardiIntegrationProvider"
Cohesion: 0.14
Nodes (11): PmsDocument, PmsFinancialSummary, PmsLease, PmsProperty, PmsResident, PmsUnit, PmsVendor, PmsWorkOrder (+3 more)

### Community 7 - "preferences.tsx"
Cohesion: 0.06
Nodes (36): Contract, ContractDetailScreen(), s, ManageListingScreen(), styles, DEALBREAKERS, HOBBIES, LANGUAGES (+28 more)

### Community 8 - "test-yardi-integration.ts"
Cohesion: 0.17
Nodes (8): YardiApiError, YardiConfigurationError, YardiIntegrationError, YardiMappingError, YardiSyncConflictError, YardiValidationError, ConflictResolutionStrategy, EntityMappingRecord

### Community 9 - "useAdminTheme"
Cohesion: 0.08
Nodes (27): AdminPayments(), styles, CompanyAnalyticsScreen(), styles, TopAptItem, AMENITIES_LIST, Apartment, CompanyApartmentsScreen() (+19 more)

### Community 10 - "collapsible.tsx"
Cohesion: 0.11
Nodes (22): RootLayout(), unstable_settings, ParallaxScrollView(), Props, styles, styles, ThemedText(), ThemedTextProps (+14 more)

### Community 11 - "YardiApiClient"
Cohesion: 0.20
Nodes (3): YardiApiClient, YardiConfig, YardiSyncManager

### Community 13 - "useTranslation"
Cohesion: 0.15
Nodes (12): 🏗 1. Stack Tecnológico Principal, 🔑 1B. Variables de Entorno y Secretos, 📂 2. Estructura del Proyecto (Expo Router), 🚨 3. Reglas Críticas de Desarrollo (Antigravity Rules), 🗄 4. Arquitectura de Base de Datos y Storage, 🎭 5. Sistema de Roles (Jerarquía), A0. Migraciones (a partir del 10 de julio, 2026), A. Tablas Principales (Supabase PostgreSQL) (+4 more)

### Community 14 - "inbox.tsx"
Cohesion: 0.15
Nodes (8): plugins, SLIDES, styles, { width, height }, Props, expo-font, expo-router, expo-web-browser

### Community 15 - "LanguageContext.tsx"
Cohesion: 0.17
Nodes (11): AdminSettings(), styles, THEME_COLORS, SettingsScreen(), styles, s, TermsScreen(), translations (+3 more)

### Community 16 - "ExploreMapView.tsx"
Cohesion: 0.17
Nodes (8): ExploreMapViewProps, styles, Callout(), ChangeView(), MapView(), Marker(), styles, useMap()

### Community 17 - "AdminThemeContext.tsx"
Cohesion: 0.20
Nodes (7): AdminLayoutContent(), NAV_ITEMS, styles, COMPANY_NAV_ITEMS, CompanyLayoutContent(), styles, AdminThemeProvider()

### Community 18 - "chat/[id].tsx"
Cohesion: 0.05
Nodes (24): ChatScreen(), styles, TypedFlashList, ChatHeaderProps, styles, ChatInputBar(), ChatInputBarProps, styles (+16 more)

### Community 19 - "app/_layout.tsx"
Cohesion: 0.10
Nodes (15): CompanyContractsScreen(), Contract, styles, Contract, ReviewContractScreen(), s, BlockedUser, BlockedUsersScreen() (+7 more)

### Community 20 - "profile/[id].tsx"
Cohesion: 0.35
Nodes (8): ProfileDetailScreen(), styles, HomeScreen(), Profile, styles, useUserProfile(), getDistanceFromLatLonInKm(), getSimilarityScore()

### Community 21 - "new.tsx"
Cohesion: 0.18
Nodes (8): ListingItem, Match, NewContractScreen(), s, ContractStepMatchesProps, Match, styles, useMatches()

### Community 22 - "reports.tsx"
Cohesion: 0.17
Nodes (11): AdminReports(), AuditItem, COMPLAINT_STATUSES, ContractItem, ListingItem, MatchItem, ProfileItem, Report (+3 more)

### Community 23 - "myprofile.tsx"
Cohesion: 0.40
Nodes (4): AdminVerifications(), PROFILE_FLAG, styles, Verification

### Community 24 - "dependencies"
Cohesion: 0.15
Nodes (13): expo-font, expo-haptics, expo-notifications, expo-splash-screen, html2pdf.js, idnumbers, dependencies, expo-font (+5 more)

### Community 25 - "users.tsx"
Cohesion: 0.18
Nodes (10): AdminUsers(), AssociationStats, AuditLog, Profile, ROLES, STATUSES, styles, UserStats (+2 more)

### Community 26 - "database.types.ts"
Cohesion: 0.18
Nodes (10): CompositeTypes, Constants, Database, DatabaseWithoutInternals, DefaultSchema, Enums, Json, Tables (+2 more)

### Community 27 - "include"
Cohesion: 0.18
Nodes (10): expo-env.d.ts, expo/tsconfig.base, .expo/types/**/*.ts, **/*.ts, **/*.tsx, compilerOptions, paths, strict (+2 more)

### Community 28 - "listings.tsx"
Cohesion: 0.18
Nodes (10): AdminListings(), Listing, ListingStats, OwnerProfile, PropertyAuditLog, StagingListing, STATUSES, styles (+2 more)

### Community 29 - "filters.tsx"
Cohesion: 0.25
Nodes (6): BUDGET_STEPS, DEFAULT_FILTERS, ExploreFilters, ExploreFiltersScreen(), s, _savedFilters

### Community 30 - "Profile"
Cohesion: 0.28
Nodes (6): ChatForwardModalProps, styles, ExploreSwipeControls(), ExploreSwipeControlsProps, styles, Profile

### Community 31 - "generate_sql.js"
Cohesion: 0.25
Nodes (8): { createClient }, FEMALE_NAMES, fs, getThemeForUser(), MALE_NAMES, run(), supabase, THEMED_SETS

### Community 32 - "reset-project.js"
Cohesion: 0.22
Nodes (7): exampleDirPath, fs, oldDirs, path, readline, rl, root

### Community 33 - "useExplore.ts"
Cohesion: 0.33
Nodes (7): getActiveFilters(), ExploreScreen(), styles, useDeviceLocation(), LIMITS, useExplore(), notifyNewMatch()

### Community 34 - "ExploreHeader.tsx"
Cohesion: 0.29
Nodes (5): ExploreHeaderProps, styles, ExploreIcon(), ExploreIconProps, styles

### Community 35 - "lib/types.ts"
Cohesion: 0.25
Nodes (7): DbContract, DbListing, DbMatch, DbMessage, DbProfile, DbSwipe, DbVerification

### Community 36 - "seed_profile_photos.js"
Cohesion: 0.29
Nodes (7): { createClient }, FEMALE_NAMES, getThemeForUser(), MALE_NAMES, seed(), supabase, THEMED_SETS

### Community 37 - "ZumperFeedGenerator"
Cohesion: 0.27
Nodes (7): GET(), getMockZumperListings(), ZumperFeedGenerator, ZumperListing, ListingRow, mapRowToZumperListing(), splitAddress()

### Community 39 - "test_yardi.ts"
Cohesion: 0.38
Nodes (4): loadConfigFromEnv(), TenantYardiData, YardiAdapter, runTests()

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
Cohesion: 0.25
Nodes (3): ExternalListing, ALLOWED_ORIGINS, getCorsHeaders()

### Community 45 - "(admin)/contracts.tsx"
Cohesion: 0.29
Nodes (6): AdminContracts(), Contract, ContractAuditLog, ContractStats, STATUS_FILTERS, styles

### Community 46 - "(admin)/index.tsx"
Cohesion: 0.33
Nodes (5): AdminOverview(), RecentContract, RecentUser, Stats, styles

### Community 47 - "roles.tsx"
Cohesion: 0.40
Nodes (5): AuditLog, RoleManagementScreen(), ROLES_LIST, styles, UserProfile

### Community 48 - "expo-router"
Cohesion: 0.40
Nodes (4): ActivityItem, CompanyDashboardHome(), MetricItem, styles

### Community 49 - "ExploreCard.tsx"
Cohesion: 0.47
Nodes (4): ExploreCard(), ExploreCardProps, styles, calculateCompatibility()

### Community 50 - "apartments.tsx"
Cohesion: 0.18
Nodes (10): "public"."contract_participants", "public"."contracts", "public"."is_admin"(), "public"."listings", "public"."matches", "public"."messages", "public"."profiles", "public"."swipes" (+2 more)

### Community 56 - "generate_listing_seeds.js"
Cohesion: 0.40
Nodes (3): { createClient }, supabase, themedPortfolios

### Community 57 - "test_msg.js"
Cohesion: 0.40
Nodes (3): envStr, supabaseKey, supabaseUrl

### Community 58 - "verify_rls_anon.mjs"
Cohesion: 0.60
Nodes (4): check(), firstId(), main(), supabase

### Community 60 - "(company)/contracts.tsx"
Cohesion: 0.48
Nodes (6): public.handle_pms_updated_at(), public.pms_company_configs, public.pms_entity_mappings, public.pms_sync_logs, trigger_pms_company_configs_updated_at, trigger_pms_entity_mappings_updated_at

### Community 65 - "mockData.ts"
Cohesion: 0.50
Nodes (3): MOCK_PROFILES, mockCurrentUserConfig, MockProfile

### Community 80 - "vercel.json"
Cohesion: 0.50
Nodes (3): headers, outputDirectory, rewrites

### Community 110 - "html2pdf.js"
Cohesion: 0.33
Nodes (5): Get a fresh project, Get started, Join the community, Learn more, Welcome to your Expo app 👋

### Community 133 - "20260712202000_assign_super_admin.sql"
Cohesion: 0.60
Nodes (4): public.check_new_profile_role(), public.check_role_update(), tr_check_new_profile_role, tr_check_role_update

### Community 134 - "signup.tsx"
Cohesion: 0.67
Nodes (3): COUNTRIES, SignUpScreen(), styles

## Knowledge Gaps
- **423 isolated node(s):** `name`, `slug`, `version`, `orientation`, `icon` (+418 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **71 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `useTranslation()` connect `supabase.ts` to `trust/index.tsx`, `preferences.tsx`, `useAdminTheme`, `LanguageContext.tsx`, `AdminThemeContext.tsx`, `chat/[id].tsx`, `app/_layout.tsx`, `profile/[id].tsx`, `new.tsx`, `reports.tsx`, `myprofile.tsx`, `users.tsx`, `listings.tsx`, `filters.tsx`, `useExplore.ts`, `(admin)/contracts.tsx`, `(admin)/index.tsx`, `roles.tsx`, `expo-router`, `ImageViewerModal.tsx`?**
  _High betweenness centrality (0.143) - this node is a cross-community bridge._
- **Why does `expo-router` connect `inbox.tsx` to `supabase.ts`, `icon-symbol.tsx`, `trust/index.tsx`, `signup.tsx`, `preferences.tsx`, `collapsible.tsx`, `LanguageContext.tsx`, `ExploreMapView.tsx`, `AdminThemeContext.tsx`, `chat/[id].tsx`, `app/_layout.tsx`, `profile/[id].tsx`, `new.tsx`, `filters.tsx`, `useExplore.ts`, `ExploreHeader.tsx`, `(tabs)/_layout.tsx`, `(admin)/index.tsx`, `ExploreCard.tsx`, `(company)/index.tsx`, `messages.tsx`, `ChatSettingsModal.tsx`, `ImageViewerModal.tsx`?**
  _High betweenness centrality (0.099) - this node is a cross-community bridge._
- **Why does `AdminContracts()` connect `(admin)/contracts.tsx` to `supabase.ts`, `useAdminTheme`, `YardiIntegrationProvider`?**
  _High betweenness centrality (0.077) - this node is a cross-community bridge._
- **What connects `name`, `slug`, `version` to the rest of the system?**
  _423 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `supabase.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.11462450592885376 - nodes in this community are weakly interconnected._
- **Should `mappers.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.11965811965811966 - nodes in this community are weakly interconnected._
- **Should `expo` be split into smaller, more focused modules?**
  _Cohesion score 0.06666666666666667 - nodes in this community are weakly interconnected._