# Graph Report - roommatefinder-app  (2026-07-26)

## Corpus Check
- 210 files · ~269,796 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1088 nodes · 1745 edges · 157 communities (86 shown, 71 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 4 edges (avg confidence: 0.57)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `9fd05b18`
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
- analytics.tsx
- calendar.tsx
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
- (company)/contracts.tsx
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
- contracts/index.tsx
- expo-symbols
- expo-system-ui
- @expo/vector-icons
- expo-web-browser
- html2pdf.js
- report.tsx
- react
- react-dom
- react-leaflet
- react-native
- @react-native-async-storage/async-storage
- react-native-deck-swiper
- react-native-gesture-handler
- ChatHeader.tsx
- react-native-maps
- ChatActionMenu.tsx
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
- ChatAttachMenu.tsx
- analytics.tsx
- MessageInfoModal.tsx
- 20260712164902_rename_phone_to_email_verification.sql
- 20260712203127_fix_profiles_privilege_escalation.sql
- @react-navigation/elements
- @react-navigation/native
- deno.json
- expo-image
- 20260726180000_add_subscriptions.sql
- expo-font

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
- `AgreementsHubScreen()` --calls--> `useTranslation()`  [EXTRACTED]
  app/contracts/index.tsx → context/LanguageContext.tsx
- `ReviewContractScreen()` --calls--> `useTranslation()`  [EXTRACTED]
  app/contracts/review.tsx → context/LanguageContext.tsx
- `PrivacyPolicyScreen()` --calls--> `useTranslation()`  [EXTRACTED]
  app/privacy-policy.tsx → context/LanguageContext.tsx
- `BlockedUsersScreen()` --calls--> `useTranslation()`  [EXTRACTED]
  app/settings/blocked.tsx → context/LanguageContext.tsx
- `SettingsScreen()` --calls--> `useTranslation()`  [EXTRACTED]
  app/settings/index.tsx → context/LanguageContext.tsx

## Import Cycles
- None detected.

## Communities (157 total, 71 thin omitted)

### Community 0 - "supabase.ts"
Cohesion: 0.26
Nodes (11): RootLayout(), unstable_settings, LanguageProvider(), getActiveChatUserId(), notifyContractUpdate(), notifyMajorWarning(), notifyNewMatch(), notifyNewMessage() (+3 more)

### Community 1 - "mappers.ts"
Cohesion: 0.16
Nodes (25): YardiMappingError, mapDocumentToYardi(), mapLeaseToYardi(), mapPropertyToYardi(), mapResidentToYardi(), mapUnitToYardi(), mapVendorToYardi(), mapWorkOrderToYardi() (+17 more)

### Community 2 - "expo"
Cohesion: 0.05
Nodes (34): backgroundColor, backgroundImage, foregroundImage, monochromeImage, adaptiveIcon, edgeToEdgeEnabled, permissions, predictiveBackGestureEnabled (+26 more)

### Community 3 - "icon-symbol.tsx"
Cohesion: 0.10
Nodes (15): styles, COUNTRIES, SignUpScreen(), styles, styles, ACTIVE_STATUSES, styles, TabLayout() (+7 more)

### Community 4 - "scripts"
Cohesion: 0.06
Nodes (33): eslint, eslint-config-expo, jest, jest-expo, devDependencies, eslint, eslint-config-expo, jest (+25 more)

### Community 5 - "trust/index.tsx"
Cohesion: 0.22
Nodes (6): s, TrustAndSafetyHub(), styles, TrustAlertButton, TrustAlertModalProps, VERIFY_CONFIG

### Community 6 - "YardiIntegrationProvider"
Cohesion: 0.14
Nodes (10): PmsDocument, PmsFinancialSummary, PmsLease, PmsProperty, PmsResident, PmsUnit, PmsVendor, PmsWorkOrder (+2 more)

### Community 7 - "preferences.tsx"
Cohesion: 0.12
Nodes (18): Contract, ContractDetailScreen(), s, ManageListingScreen(), styles, DEALBREAKERS, HOBBIES, LANGUAGES (+10 more)

### Community 8 - "test-yardi-integration.ts"
Cohesion: 0.16
Nodes (9): validateConfig(), YardiConfig, YardiApiError, YardiConfigurationError, YardiIntegrationError, YardiSyncConflictError, YardiValidationError, ConflictResolutionStrategy (+1 more)

### Community 9 - "useAdminTheme"
Cohesion: 0.18
Nodes (6): BlockedUser, BlockedUsersScreen(), s, s, SecurityTipsScreen(), expo-router

### Community 10 - "collapsible.tsx"
Cohesion: 0.18
Nodes (12): ParallaxScrollView(), Props, styles, styles, ThemedText(), ThemedTextProps, ThemedView(), ThemedViewProps (+4 more)

### Community 11 - "YardiApiClient"
Cohesion: 0.20
Nodes (3): AdminSettings(), YardiApiClient, YardiSyncManager

### Community 13 - "useTranslation"
Cohesion: 0.15
Nodes (12): 🏗 1. Stack Tecnológico Principal, 🔑 1B. Variables de Entorno y Secretos, 📂 2. Estructura del Proyecto (Expo Router), 🚨 3. Reglas Críticas de Desarrollo (Antigravity Rules), 🗄 4. Arquitectura de Base de Datos y Storage, 🎭 5. Sistema de Roles (Jerarquía), A0. Migraciones (a partir del 10 de julio, 2026), A. Tablas Principales (Supabase PostgreSQL) (+4 more)

### Community 14 - "inbox.tsx"
Cohesion: 0.17
Nodes (8): MyProfileScreen(), s, styles, EditProfileModalProps, styles, ProfileLifestyleDetailsProps, styles, useUpdateProfileMutation()

### Community 15 - "LanguageContext.tsx"
Cohesion: 0.16
Nodes (12): styles, THEME_COLORS, PrivacyPolicyScreen(), s, SettingsScreen(), styles, s, TermsScreen() (+4 more)

### Community 16 - "ExploreMapView.tsx"
Cohesion: 0.07
Nodes (24): ChatForwardModalProps, styles, ExploreCard(), ExploreCardProps, styles, ExploreMapViewProps, styles, ExploreSwipeControls() (+16 more)

### Community 17 - "AdminThemeContext.tsx"
Cohesion: 0.15
Nodes (10): AMENITIES_LIST, Apartment, CompanyApartmentsScreen(), styles, COMPANY_NAV_ITEMS, CompanyLayoutContent(), styles, AdminThemeContext (+2 more)

### Community 18 - "chat/[id].tsx"
Cohesion: 0.18
Nodes (10): ChatScreen(), styles, TypedFlashList, ChatInputBar(), ChatInputBarProps, styles, ChatMessageItem, ChatMessageItemProps (+2 more)

### Community 19 - "app/_layout.tsx"
Cohesion: 0.14
Nodes (13): FollowersScreen(), styles, AboutScreen(), styles, HelpScreen(), styles, NotificationsScreen(), styles (+5 more)

### Community 20 - "profile/[id].tsx"
Cohesion: 0.12
Nodes (13): ActivityItem, styles, InboxScreen(), styles, TypedFlashList, InboxConversationItem, InboxConversationItemProps, styles (+5 more)

### Community 21 - "new.tsx"
Cohesion: 0.18
Nodes (9): ListingItem, Match, NewContractScreen(), s, ContractStepMatchesProps, Match, styles, useMatches() (+1 more)

### Community 22 - "reports.tsx"
Cohesion: 0.17
Nodes (11): AdminReports(), AuditItem, COMPLAINT_STATUSES, ContractItem, ListingItem, MatchItem, ProfileItem, Report (+3 more)

### Community 23 - "myprofile.tsx"
Cohesion: 0.22
Nodes (10): ProfileDetailScreen(), styles, HomeScreen(), Profile, styles, styles, useMyProfile(), useUserProfile() (+2 more)

### Community 24 - "dependencies"
Cohesion: 0.15
Nodes (13): expo, expo-haptics, expo-notifications, expo-status-bar, idnumbers, leaflet, dependencies, expo (+5 more)

### Community 25 - "users.tsx"
Cohesion: 0.12
Nodes (21): AdminContracts(), Contract, ContractAuditLog, ContractStats, STATUS_FILTERS, styles, AdminListings(), AdminUsers() (+13 more)

### Community 26 - "database.types.ts"
Cohesion: 0.20
Nodes (9): Listing, ListingStats, OwnerProfile, PropertyAuditLog, StagingListing, STATUSES, styles, VERIFICATIONS (+1 more)

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
Cohesion: 0.29
Nodes (8): getActiveFilters(), ExploreScreen(), styles, useDeviceLocation(), FALLBACK_COORDS, LIMITS, useExplore(), withMapCoords()

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

### Community 38 - "(tabs)/_layout.tsx"
Cohesion: 0.50
Nodes (3): AdminLayoutContent(), NAV_ITEMS, styles

### Community 39 - "test_yardi.ts"
Cohesion: 0.50
Nodes (4): RoleManagementScreen(), ROLES_LIST, styles, UserProfile

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
Cohesion: 0.13
Nodes (13): ExternalListing, getMockListings(), getRealListings(), ALLOWED_ORIGINS, getCorsHeaders(), createCheckoutSession(), getSubscription(), StripeCheckoutSession (+5 more)

### Community 45 - "(admin)/contracts.tsx"
Cohesion: 0.40
Nodes (4): AdminVerifications(), PROFILE_FLAG, styles, Verification

### Community 46 - "(admin)/index.tsx"
Cohesion: 0.40
Nodes (3): ChatSettingsModalProps, PRESET_WALLPAPERS, styles

### Community 47 - "roles.tsx"
Cohesion: 0.22
Nodes (4): s, VerificationWizard(), styles, TrustInstagramModalProps

### Community 48 - "expo-router"
Cohesion: 0.40
Nodes (4): ActivityItem, CompanyDashboardHome(), MetricItem, styles

### Community 49 - "ExploreCard.tsx"
Cohesion: 0.40
Nodes (3): ImageViewerModalProps, styles, { width: SCREEN_WIDTH, height: SCREEN_HEIGHT }

### Community 50 - "apartments.tsx"
Cohesion: 0.18
Nodes (10): "public"."contract_participants", "public"."contracts", "public"."is_admin"(), "public"."listings", "public"."matches", "public"."messages", "public"."profiles", "public"."swipes" (+2 more)

### Community 51 - "(company)/index.tsx"
Cohesion: 0.08
Nodes (17): SLIDES, styles, { width, height }, Role, styles, CompositeTypes, Constants, Database (+9 more)

### Community 54 - "ImageViewerModal.tsx"
Cohesion: 0.40
Nodes (3): BadgeConfig, styles, TrustBadgeDetailModalProps

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

### Community 63 - "analytics.tsx"
Cohesion: 0.50
Nodes (3): CompanyAnalyticsScreen(), styles, TopAptItem

### Community 64 - "calendar.tsx"
Cohesion: 0.50
Nodes (3): CalendarEvent, CompanyCalendarScreen(), styles

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
Cohesion: 0.15
Nodes (13): ACTIVE_STATUSES, AdminPayments(), styles, Application, CompanyApplicationsScreen(), styles, ChatThread, CompanyMessagesScreen() (+5 more)

### Community 88 - "(company)/contracts.tsx"
Cohesion: 0.50
Nodes (3): CompanyContractsScreen(), Contract, styles

### Community 94 - "EditProfileModal.tsx"
Cohesion: 0.40
Nodes (4): CI, Correr localmente, Qué cubre hoy, Tests de base de datos (pgTAP)

### Community 95 - "expo-image"
Cohesion: 0.50
Nodes (3): CompanyNotificationsScreen(), NotificationItem, styles

### Community 104 - "contracts/index.tsx"
Cohesion: 0.50
Nodes (3): AgreementsHubScreen(), Contract, s

### Community 110 - "html2pdf.js"
Cohesion: 0.33
Nodes (5): Get a fresh project, Get started, Join the community, Learn more, Welcome to your Expo app 👋

### Community 111 - "report.tsx"
Cohesion: 0.50
Nodes (3): CONFLICT_REASONS, ConflictResolutionCenter(), s

### Community 133 - "20260712202000_assign_super_admin.sql"
Cohesion: 0.60
Nodes (4): public.check_new_profile_role(), public.check_role_update(), tr_check_new_profile_role, tr_check_role_update

## Knowledge Gaps
- **443 isolated node(s):** `name`, `slug`, `version`, `orientation`, `icon` (+438 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **71 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `useTranslation()` connect `app/_layout.tsx` to `trust/index.tsx`, `preferences.tsx`, `useAdminTheme`, `YardiApiClient`, `inbox.tsx`, `LanguageContext.tsx`, `AdminThemeContext.tsx`, `chat/[id].tsx`, `profile/[id].tsx`, `new.tsx`, `reports.tsx`, `myprofile.tsx`, `users.tsx`, `database.types.ts`, `filters.tsx`, `useExplore.ts`, `lib/types.ts`, `(tabs)/_layout.tsx`, `test_yardi.ts`, `(admin)/contracts.tsx`, `roles.tsx`, `expo-router`, `applications.tsx`, `analytics.tsx`, `calendar.tsx`, `expo-av`, `(company)/contracts.tsx`, `expo-image`, `contracts/index.tsx`, `report.tsx`?**
  _High betweenness centrality (0.144) - this node is a cross-community bridge._
- **Why does `AdminContracts()` connect `users.tsx` to `app/_layout.tsx`, `YardiIntegrationProvider`, `expo-av`?**
  _High betweenness centrality (0.071) - this node is a cross-community bridge._
- **Why does `expo-router` connect `useAdminTheme` to `supabase.ts`, `expo`, `icon-symbol.tsx`, `trust/index.tsx`, `preferences.tsx`, `inbox.tsx`, `LanguageContext.tsx`, `ExploreMapView.tsx`, `AdminThemeContext.tsx`, `chat/[id].tsx`, `app/_layout.tsx`, `profile/[id].tsx`, `new.tsx`, `myprofile.tsx`, `filters.tsx`, `useExplore.ts`, `ExploreHeader.tsx`, `lib/types.ts`, `(tabs)/_layout.tsx`, `roles.tsx`, `(company)/index.tsx`, `applications.tsx`, `contracts/index.tsx`, `report.tsx`?**
  _High betweenness centrality (0.059) - this node is a cross-community bridge._
- **What connects `name`, `slug`, `version` to the rest of the system?**
  _443 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `expo` be split into smaller, more focused modules?**
  _Cohesion score 0.05405405405405406 - nodes in this community are weakly interconnected._
- **Should `icon-symbol.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.09523809523809523 - nodes in this community are weakly interconnected._
- **Should `scripts` be split into smaller, more focused modules?**
  _Cohesion score 0.058823529411764705 - nodes in this community are weakly interconnected._