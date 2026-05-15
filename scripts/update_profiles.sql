-- =====================================================
-- Update all profiles with new English schema data
-- Run this in Supabase SQL Editor (Dashboard > SQL Editor)
-- =====================================================

-- 1. Carlos (seeker, introvert, tidy, early bird)
UPDATE profiles SET
  likes = '🎮 Video Games, 📚 Reading, 🎵 Music',
  preferences = '🌅 Early bird, 🧹 Very tidy, 🤫 Quiet evenings',
  dealbreakers = '🚬 Smoking indoors, 🐈 Pets, 🗑️ Messy areas',
  role = 'seeker',
  lifestyle = '{"sleep":"Early bird","cleanliness":"Very tidy","social":"Introvert","parties":"Never","pets":"None","smoking":"No","music":"No","work":"Remote","occupation":"Working","budget":"$500 - $1000","cooking":"Sometimes","languages":["Spanish","English"]}'::jsonb
WHERE id = 'e19732fe-202a-47b9-9a54-b813408dd24c';

-- 2. Sofia (host, extrovert, night owl, social)
UPDATE profiles SET
  likes = '🎵 Music, ✈️ Traveling, 🍳 Cooking, 🏋️ Fitness',
  preferences = '🦉 Night owl, 🎉 Guests welcome, 🧹 Relaxed cleaning',
  dealbreakers = '🥳 Late parties, 💸 Unpaid bills',
  role = 'host',
  lifestyle = '{"sleep":"Night owl","cleanliness":"Relaxed","social":"Extrovert","parties":"Sometimes","pets":"Love pets","smoking":"No","music":"Yes","work":"Hybrid","occupation":"Both","budget":"$500 - $1000","cooking":"Frequently","languages":["Spanish","English","French"]}'::jsonb
WHERE id = 'f559302c-5bfa-4b65-936f-b6f302453753';

-- 3. David (seeker, introvert, quiet, remote worker)
UPDATE profiles SET
  likes = '📚 Reading, 🎵 Music, 🍳 Cooking',
  preferences = '🤫 Quiet evenings, 🏠 Work from home, 🧹 Normal cleaning',
  dealbreakers = '🔊 Loud music, 🥳 Late parties, 🚬 Smoking indoors',
  role = 'seeker',
  lifestyle = '{"sleep":"Flexible","cleanliness":"Normal","social":"Introvert","parties":"Never","pets":"None","smoking":"No","music":"No","work":"Remote","occupation":"Working","budget":"$1000 - $1500","cooking":"Frequently","languages":["English","German"]}'::jsonb
WHERE id = '31f9b999-10c9-4ad0-a89d-4c668f515bb4';

-- 4. Valeria (host, ambivert, tidy, early bird)
UPDATE profiles SET
  likes = '🍳 Cooking, 🎮 Video Games, 🎨 Art',
  preferences = '🧹 Very tidy, 🎉 Guests welcome, 🌅 Early riser',
  dealbreakers = '🗑️ Messy areas, 💸 Unpaid bills',
  role = 'host',
  lifestyle = '{"sleep":"Early bird","cleanliness":"Very tidy","social":"Ambivert","parties":"Sometimes","pets":"I have pets","smoking":"No","music":"No","work":"In office","occupation":"Working","budget":"$1000 - $1500","cooking":"Frequently","languages":["Spanish","English"]}'::jsonb
WHERE id = 'ba968a20-0d24-4cb9-b79e-8bef4114591b';

-- 5. Alejandro (seeker, extrovert, night owl, student)
UPDATE profiles SET
  likes = '🎮 Video Games, ✈️ Traveling, ⚽ Sports',
  preferences = '🦉 Night owl, 🧹 Normal cleaning, 🎉 Social',
  dealbreakers = '🚬 Smoking indoors, 🗑️ Messy areas',
  role = 'seeker',
  lifestyle = '{"sleep":"Night owl","cleanliness":"Normal","social":"Extrovert","parties":"Sometimes","pets":"Love pets","smoking":"No","music":"Yes","work":"Hybrid","occupation":"Student","budget":"< $500","cooking":"Rarely","languages":["Spanish","English"]}'::jsonb
WHERE id = 'f847d386-b0aa-4421-8c54-1bc14278a928';

-- 6. Valentina (seeker, ambivert, early bird, student)
UPDATE profiles SET
  likes = '🎨 Art, 📸 Photography, 📚 Reading',
  preferences = '🌅 Early bird, 🤫 Quiet focus, 🧹 Normal cleaning',
  dealbreakers = '🔊 Loud music, 🥳 Late parties',
  role = 'seeker',
  lifestyle = '{"sleep":"Early bird","cleanliness":"Normal","social":"Ambivert","parties":"Never","pets":"None","smoking":"No","music":"No","work":"In office","occupation":"Student","budget":"< $500","cooking":"Sometimes","languages":["Spanish","English"]}'::jsonb
WHERE id = 'eed51b09-d4ec-4d6a-94ea-46b62afacd7d';

-- 7. Mateo (seeker, introvert, very tidy, early bird)
UPDATE profiles SET
  likes = '🏋️ Fitness, 🍳 Cooking, 📚 Reading',
  preferences = '🌅 Early riser, 🧹 Very tidy, 🤫 No parties',
  dealbreakers = '🗑️ Messy areas, 🚬 Smoking indoors',
  role = 'seeker',
  lifestyle = '{"sleep":"Early bird","cleanliness":"Very tidy","social":"Introvert","parties":"Never","pets":"Allergic","smoking":"No","music":"No","work":"In office","occupation":"Working","budget":"$500 - $1000","cooking":"Frequently","languages":["Spanish","English"]}'::jsonb
WHERE id = '30a6e866-fb68-438f-ad00-ee96b38eb65e';

-- 8. Camila (seeker, extrovert, night owl, pet lover)
UPDATE profiles SET
  likes = '🐶 Pets, 🎵 Music, ⚽ Sports',
  preferences = '🦉 Night owl, 🎉 Party friendly, 🐾 Pet lover',
  dealbreakers = '🚬 Smoking indoors, 🗑️ Messy areas',
  role = 'seeker',
  lifestyle = '{"sleep":"Night owl","cleanliness":"Relaxed","social":"Extrovert","parties":"Frequent","pets":"I have pets","smoking":"Outdoors only","music":"Yes","work":"Hybrid","occupation":"Student","budget":"< $500","cooking":"Rarely","languages":["Spanish","English","Portuguese"]}'::jsonb
WHERE id = '506949c8-38bf-48d5-b307-7feed6ae5855';

-- 9. Lucas (seeker, introvert, early bird, remote)
UPDATE profiles SET
  likes = '📚 Reading, ✈️ Traveling, 📸 Photography',
  preferences = '🌅 Early riser, 🤫 Quiet lifestyle, 🏠 Remote worker',
  dealbreakers = '🥳 Late parties, 💸 Unpaid bills',
  role = 'seeker',
  lifestyle = '{"sleep":"Early bird","cleanliness":"Normal","social":"Introvert","parties":"Never","pets":"None","smoking":"No","music":"No","work":"Remote","occupation":"Working","budget":"$1000 - $1500","cooking":"Sometimes","languages":["English","French"]}'::jsonb
WHERE id = 'f6a113e6-9d79-44b4-8f09-5c8f4b25dc8a';

-- 10. Isabella (host, extrovert, night owl, creative)
UPDATE profiles SET
  likes = '🎵 Music, 🎨 Art, ✈️ Traveling, ⚽ Sports',
  preferences = '🦉 Night owl, 🎉 Social butterfly, 🎶 Music lover',
  dealbreakers = '🚬 Smoking indoors',
  role = 'host',
  lifestyle = '{"sleep":"Night owl","cleanliness":"Relaxed","social":"Extrovert","parties":"Frequent","pets":"Love pets","smoking":"No","music":"Yes","work":"Hybrid","occupation":"Both","budget":"$500 - $1000","cooking":"Rarely","languages":["Spanish","English","Italian"]}'::jsonb
WHERE id = 'fe9724fd-afeb-46dd-846d-6dcca373f07b';

-- 11. Thiago (seeker, extrovert, flexible, sporty)
UPDATE profiles SET
  likes = '⚽ Sports, 🎮 Video Games, 🏋️ Fitness',
  preferences = '⚡ Flexible schedule, 🎉 Social life, ⚽ Active lifestyle',
  dealbreakers = '💸 Unpaid bills, 🗑️ Messy areas',
  role = 'seeker',
  lifestyle = '{"sleep":"Flexible","cleanliness":"Normal","social":"Extrovert","parties":"Sometimes","pets":"Love pets","smoking":"No","music":"Yes","work":"In office","occupation":"Student","budget":"< $500","cooking":"Sometimes","languages":["Spanish","English"]}'::jsonb
WHERE id = '30e43048-aedd-4903-97e6-e594bb4267a2';

-- 12. Martina (seeker, ambivert, flexible, tidy)
UPDATE profiles SET
  likes = '📸 Photography, ✈️ Traveling, 🍳 Cooking',
  preferences = '⚡ Flexible schedule, 🧹 Very tidy, 🤫 Quiet home',
  dealbreakers = '🗑️ Messy areas, 🚬 Smoking indoors',
  role = 'seeker',
  lifestyle = '{"sleep":"Flexible","cleanliness":"Very tidy","social":"Ambivert","parties":"Never","pets":"None","smoking":"No","music":"No","work":"Remote","occupation":"Working","budget":"$1000 - $1500","cooking":"Sometimes","languages":["Spanish","English","French"]}'::jsonb
WHERE id = 'c90179ec-3337-4447-9435-1220ec9a0ab0';

-- 13. Benjamin (seeker, introvert, night owl, gamer)
UPDATE profiles SET
  likes = '🎮 Video Games, 🍳 Cooking, 📚 Reading',
  preferences = '🦉 Night owl, 🎮 Gamer, 🤫 Quiet evenings',
  dealbreakers = '🔊 Loud music, 🐈 Pets',
  role = 'seeker',
  lifestyle = '{"sleep":"Night owl","cleanliness":"Normal","social":"Introvert","parties":"Sometimes","pets":"Allergic","smoking":"No","music":"No","work":"Remote","occupation":"Student","budget":"< $500","cooking":"Frequently","languages":["Spanish","English"]}'::jsonb
WHERE id = '6a2ab1bc-9258-4a04-9b66-57d21cce902b';

-- 14. Emma (seeker, ambivert, early bird, active)
UPDATE profiles SET
  likes = '🏋️ Fitness, 📚 Reading, 🐶 Pets',
  preferences = '🌅 Early bird, 🧹 Very tidy, 🏋️ Active lifestyle',
  dealbreakers = '🚬 Smoking indoors, 🥳 Late parties',
  role = 'seeker',
  lifestyle = '{"sleep":"Early bird","cleanliness":"Very tidy","social":"Ambivert","parties":"Never","pets":"Love pets","smoking":"No","music":"No","work":"In office","occupation":"Working","budget":"$500 - $1000","cooking":"Sometimes","languages":["English","German"]}'::jsonb
WHERE id = '010ab3b4-141f-42d3-8d64-e275013c66c9';

-- 15. Santiago (seeker, introvert, early bird, studious)
UPDATE profiles SET
  likes = '📚 Reading, 🎵 Music, 🎨 Art',
  preferences = '🌅 Early bird, 🤫 Quiet & studious, 🧹 Normal cleaning',
  dealbreakers = '🥳 Late parties, 🔊 Loud music',
  role = 'seeker',
  lifestyle = '{"sleep":"Early bird","cleanliness":"Normal","social":"Introvert","parties":"Never","pets":"None","smoking":"No","music":"No","work":"In office","occupation":"Student","budget":"$500 - $1000","cooking":"Sometimes","languages":["Spanish","English"]}'::jsonb
WHERE id = 'c686fd21-0d02-4313-96dd-4f5688b41460';

-- 16. Lucia (host, ambivert, night owl, creative)
UPDATE profiles SET
  likes = '🎨 Art, 📸 Photography, ✈️ Traveling',
  preferences = '🦉 Night owl, 🎨 Creative space, 🐾 Pet friendly',
  dealbreakers = '🔊 Loud music, 🗑️ Messy areas',
  role = 'host',
  lifestyle = '{"sleep":"Night owl","cleanliness":"Normal","social":"Ambivert","parties":"Sometimes","pets":"Love pets","smoking":"No","music":"No","work":"Hybrid","occupation":"Working","budget":"$1000 - $1500","cooking":"Sometimes","languages":["Spanish","English","Italian"]}'::jsonb
WHERE id = 'd0b9a7b4-f37b-47e3-9ec5-c41e5b7c24b2';

-- 17. Joaquin (seeker, extrovert, flexible, sporty)
UPDATE profiles SET
  likes = '⚽ Sports, ✈️ Traveling, 🎵 Music',
  preferences = '⚡ Flexible schedule, 🎉 Party friendly, ⚽ Sports fan',
  dealbreakers = '💸 Unpaid bills, 🚬 Smoking indoors',
  role = 'seeker',
  lifestyle = '{"sleep":"Flexible","cleanliness":"Relaxed","social":"Extrovert","parties":"Frequent","pets":"Love pets","smoking":"Outdoors only","music":"Yes","work":"In office","occupation":"Student","budget":"< $500","cooking":"Rarely","languages":["Spanish","English"]}'::jsonb
WHERE id = 'fcbf0137-94ef-49f1-b748-aa22d7c47646';

-- 18. Victoria (seeker, introvert, early bird, pet owner)
UPDATE profiles SET
  likes = '🐶 Pets, 🎮 Video Games, 📚 Reading',
  preferences = '🌅 Early bird, 🤫 Quiet home, 🐾 Has pets',
  dealbreakers = '🚬 Smoking indoors, 🥳 Late parties',
  role = 'seeker',
  lifestyle = '{"sleep":"Early bird","cleanliness":"Normal","social":"Introvert","parties":"Never","pets":"I have pets","smoking":"No","music":"No","work":"Remote","occupation":"Both","budget":"$500 - $1000","cooking":"Sometimes","languages":["Spanish","English"]}'::jsonb
WHERE id = 'de2e8332-160f-4833-af8f-20d1765441ae';

-- 19. Diego (seeker, extrovert, flexible, cook)
UPDATE profiles SET
  likes = '🍳 Cooking, ⚽ Sports, 🏋️ Fitness',
  preferences = '⚡ Flexible schedule, 🎉 Guests welcome, 🍳 Home cook',
  dealbreakers = '💸 Unpaid bills, 🔊 Loud music',
  role = 'seeker',
  lifestyle = '{"sleep":"Flexible","cleanliness":"Relaxed","social":"Extrovert","parties":"Sometimes","pets":"None","smoking":"Outdoors only","music":"Yes","work":"In office","occupation":"Working","budget":"$500 - $1000","cooking":"Frequently","languages":["Spanish","English","Portuguese"]}'::jsonb
WHERE id = '304abb76-00a0-4a81-af95-e0df2943fbb6';

-- 20. Andrew (formerly "New Roommate" #1 — seeker, ambivert)
UPDATE profiles SET
  name = 'Andrew',
  likes = '📚 Reading, 🏋️ Fitness, ✈️ Traveling',
  preferences = '🌅 Early bird, 🤫 Quiet environment, 🏠 Remote worker',
  dealbreakers = '🔊 Loud music, 🚬 Smoking indoors',
  role = 'seeker',
  lifestyle = '{"sleep":"Early bird","cleanliness":"Normal","social":"Ambivert","parties":"Sometimes","pets":"Love pets","smoking":"No","music":"No","work":"Remote","occupation":"Student","budget":"< $500","cooking":"Sometimes","languages":["English"]}'::jsonb
WHERE id = '9a34d2d8-c60b-48c0-8e57-0eae7e09bbd7';

-- 21. Rachel (formerly "New Roommate" #2 — seeker, introvert, tidy)
UPDATE profiles SET
  name = 'Rachel',
  likes = '📚 Reading, 🏋️ Fitness, 🍳 Cooking, 🎵 Music',
  preferences = '⚡ Flexible, 🧹 Very tidy, 🏠 Remote worker',
  dealbreakers = '💸 Unpaid bills, 🗑️ Messy areas',
  role = 'seeker',
  lifestyle = '{"sleep":"Flexible","cleanliness":"Very tidy","social":"Introvert","parties":"Never","pets":"None","smoking":"No","music":"No","work":"Remote","occupation":"Working","budget":"$500 - $1000","cooking":"Frequently","languages":["English","French"]}'::jsonb
WHERE id = '79299aae-ff5d-4d6c-b68d-3cbd52193bda';

-- 22. Juanjo (translate Spanish lifestyle to English)
UPDATE profiles SET
  preferences = '🦉 Night owl, 🎮 Gamer, 📸 Photography lover',
  lifestyle = '{"sleep":"Night owl","cleanliness":"Normal","social":"Extrovert","parties":"Never","pets":"I have pets","smoking":"Yes","music":"No","work":"Hybrid","occupation":"Student","budget":"< $500","cooking":"Sometimes","languages":["Spanish","English"]}'::jsonb
WHERE id = '8b1d9a60-b365-4f7b-b3f3-c1267a8bc1e9';

-- Verify results
SELECT name, role, likes, preferences, dealbreakers, 
       lifestyle->>'sleep' as sleep,
       lifestyle->>'social' as social,
       lifestyle->>'cleanliness' as cleanliness
FROM profiles 
ORDER BY name;
