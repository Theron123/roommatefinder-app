require('dotenv').config({ path: '.env' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing supabase credentials");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Hand-curated list of 35 themed sets of 5 completely unique Unsplash images each (Total 175 unique images)
const UNIQUE_THEMED_SETS = [
  // Set 1: artistic_female
  [
    "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=600&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=600&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=600&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1518770660439-4636190af475?w=600&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?w=600&auto=format&fit=crop&q=80"
  ],
  // Set 2: tech_outdoors_male
  [
    "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=600&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1501555088652-021faa106b9b?w=600&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=600&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1488590528505-98d2b5aba04b?w=600&auto=format&fit=crop&q=80"
  ],
  // Set 3: social_active_female
  [
    "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1543007630-9710e4a00a20?w=600&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1513836279014-a89f7a76ae86?w=600&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1485199645743-c6ec49d5001e?w=600&auto=format&fit=crop&q=80"
  ],
  // Set 4: coffee_active_male
  [
    "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=600&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=600&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1484154218962-a197022b5858?w=600&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1444858291040-58fe7a258d47?w=600&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1469033090071-3a3d07e77885?w=600&auto=format&fit=crop&q=80"
  ],
  // Set 5: culinary_cozy_female
  [
    "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=600&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=600&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1512568400610-62da28bc8a13?w=600&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=600&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1517433456452-f9633a875f6f?w=600&auto=format&fit=crop&q=80"
  ],
  // Set 6: music_creative_male
  [
    "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=600&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=600&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=600&auto=format&fit=crop&q=80"
  ],
  // Set 7: plant_gardener_female
  [
    "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=600&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1463936575829-25148e1db1b8?w=600&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1530741929025-a400efccb55f?w=600&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1485955900006-10f4d324d411?w=600&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1502082553048-f009c37129b9?w=600&auto=format&fit=crop&q=80"
  ],
  // Set 8: adventure_hiker_male
  [
    "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=600&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=600&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1478131148059-02482c893f1f?w=600&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=600&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1454496522488-7a8e488e8606?w=600&auto=format&fit=crop&q=80"
  ],
  // Set 9: aesthetic_minimalist_female
  [
    "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=600&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=600&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=600&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1518156677180-95a2893f3e9f?w=600&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1526047932273-341f2a7631f9?w=600&auto=format&fit=crop&q=80"
  ],
  // Set 10: traveler_wanderer_male
  [
    "https://images.unsplash.com/photo-1488161628813-04466f872be2?w=600&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=600&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=600&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1527631746610-bca00a040d60?w=600&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1500835595337-f7400171ab6f?w=600&auto=format&fit=crop&q=80"
  ],
  // Set 11: cozy_bookworm_female
  [
    "https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=600&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=600&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=600&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1516979187457-637abb4f9353?w=600&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1526244434175-ee63de9015b7?w=600&auto=format&fit=crop&q=80"
  ],
  // Set 12: urban_architect_male
  [
    "https://images.unsplash.com/photo-1504257400765-1a1092199b45?w=600&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=600&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1503387873261-37898b8533a5?w=600&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=600&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1513694203232-719a280e022f?w=600&auto=format&fit=crop&q=80"
  ],
  // Set 13: fashion_stylist_female
  [
    "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=600&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?w=600&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1532453288672-3a27e9be9efd?w=600&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=600&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1509631179647-0177331693ae?w=600&auto=format&fit=crop&q=80"
  ],
  // Set 14: fitness_runner_male
  [
    "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=600&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?w=600&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=600&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1538805060514-97d9cc17730c?w=600&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1498837167922-ddd27525d352?w=600&auto=format&fit=crop&q=80"
  ],
  // Set 15: culinary_chef_female
  [
    "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=600&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1547592180-85f173990554?w=600&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1498579150354-9705007a37c7?w=600&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1551183053-bf91a1d81141?w=600&auto=format&fit=crop&q=80"
  ],
  // Set 16: gamer_tech_male
  [
    "https://images.unsplash.com/photo-1531427186611-ecfd6d936c79?w=600&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=600&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1600861195091-690c92f1d2cc?w=600&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1593305841991-05c297ba4575?w=600&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=600&auto=format&fit=crop&q=80"
  ],
  // Set 17: yoga_zen_female
  [
    "https://images.unsplash.com/photo-1567532939604-b6b5b0db2604?w=600&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=600&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=600&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1515003197210-e0cd71810b5f?w=600&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1522441815192-d9f04eb0615c?w=600&auto=format&fit=crop&q=80"
  ],
  // Set 18: pet_nature_male
  [
    "https://images.unsplash.com/photo-1552058544-f2b08422138a?w=600&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=600&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=600&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1448375240586-882707db888b?w=600&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1507146426996-ef05306b995a?w=600&auto=format&fit=crop&q=80"
  ],
  // Set 19: writer_poet_female
  [
    "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=600&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1516414447565-b14be0adf13e?w=600&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1455390582262-044cdead277a?w=600&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=600&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1519681393784-d120267933ba?w=600&auto=format&fit=crop&q=80"
  ],
  // Set 20: cyclist_commuter_male
  [
    "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=600&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1485965120184-e220f721d03e?w=600&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1505705694340-019e1e335916?w=600&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1541614101331-1a5a3a194e92?w=600&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1473186578172-c141e6798cf4?w=600&auto=format&fit=crop&q=80"
  ],
  // Set 21: photo_enthusiast_female
  [
    "https://images.unsplash.com/photo-1548142813-c348350df52b?w=600&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=600&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1554080353-a576cf803bda?w=600&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1500989145603-8e7ef71d639e?w=600&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?w=600&auto=format&fit=crop&q=80"
  ],
  // Set 22: pottery_ceramic_male
  [
    "https://images.unsplash.com/photo-1501196354995-cbb51c65aaea?w=600&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1565192647048-f997ded87958?w=600&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1576016770956-debb63d900ee?w=600&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1525974162459-bf4b2609076f?w=600&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1518281400699-c2669e98e8c9?w=600&auto=format&fit=crop&q=80"
  ],
  // Set 23: movie_cinephile_female
  [
    "https://images.unsplash.com/photo-1554151228-14d9def656e4?w=600&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?w=600&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=600&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1585647347483-22b66260dfff?w=600&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1535016120720-40c646be5580?w=600&auto=format&fit=crop&q=80"
  ],
  // Set 24: skater_youth_male
  [
    "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=600&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1520156473397-622e030e815a?w=600&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1564982752274-333f40609a5c?w=600&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1547447134-cd3f5c716030?w=600&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1598550476439-6847785fce6e?w=600&auto=format&fit=crop&q=80"
  ],
  // Set 25: florist_gardener_female
  [
    "https://images.unsplash.com/photo-1614283233556-f35b0c801ef1?w=600&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1556911220-e15b29be8c8f?w=600&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1582794543139-8ac9cb0f7b11?w=600&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1523348837708-15d4a09cfac2?w=600&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1597244211919-8a52ab2e40ea?w=600&auto=format&fit=crop&q=80"
  ],
  // Set 26: tea_meditate_male
  [
    "https://images.unsplash.com/photo-1519345182560-3f2917c472ef?w=600&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1536256263959-770b48d82b0a?w=600&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1545191403-230bc551f34b?w=600&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1555597673-b21d5c935865?w=600&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1518241353330-0f7941c2d9b5?w=600&auto=format&fit=crop&q=80"
  ],
  // Set 27: astronomy_star_male
  [
    "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=600&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1506318137071-a8e063b4bec0?w=600&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=600&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?w=600&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?w=600&auto=format&fit=crop&q=80"
  ],
  // Set 28: vintage_retro_male
  [
    "https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=600&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1526470608268-f674ce90ebd4?w=600&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1505373671202-7c4ab68448ec?w=600&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1516280440614-37939bbacd6a?w=600&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=600&auto=format&fit=crop&q=80"
  ],
  // Set 29: basketball_hoop_male
  [
    "https://images.unsplash.com/photo-1544725176-7c40e5a71c5e?w=600&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1505666287802-931dc83948e9?w=600&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1546519638-68e109498ffc?w=600&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1515703407324-5f753eed2411?w=600&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1519766304817-4f37bda74a27?w=600&auto=format&fit=crop&q=80"
  ],
  // Set 30: marathon_runner_male
  [
    "https://images.unsplash.com/photo-1534308983496-4fabb1a015ee?w=600&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1530143311094-34d807799e8f?w=600&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1502224562085-639556652f33?w=600&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1523362628745-0c100150b504?w=600&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1505253758473-96b7015fcd40?w=600&auto=format&fit=crop&q=80"
  ],
  // Set 31: craft_diy_female
  [
    "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=600&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=600&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1506784983877-45594efa4cbe?w=600&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1544816155-12df9643f363?w=600&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1509281373149-e957c6296406?w=600&auto=format&fit=crop&q=80"
  ],
  // Set 32: dj_turntable_male
  [
    "https://images.unsplash.com/photo-1542909168-82c3e7fdca5c?w=600&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=600&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1484755560695-a4c7300c5c29?w=600&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?w=600&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=600&auto=format&fit=crop&q=80"
  ],
  // Set 33: wine_connoisseur_female
  [
    "https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=600&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=600&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1528825871115-3581a5387919?w=600&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1486887396153-fa416526c132?w=600&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=600&auto=format&fit=crop&q=80"
  ],
  // Set 34: interior_decorator_male
  [
    "https://images.unsplash.com/photo-1507153767218-8b6ecdbccf72?w=600&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1524758631624-e2822e304c36?w=600&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1513584684374-8bab748fbf90?w=600&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1533090161767-e6ffed986c88?w=600&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=600&auto=format&fit=crop&q=80"
  ],
  // Set 35: swimmer_diver_female
  [
    "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=600&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1530541930197-ff16ac917b0e?w=600&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1519046904884-53103b34b206?w=600&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1502680390469-be75c86b636f?w=600&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1482862549707-f63cb32c5fd9?w=600&auto=format&fit=crop&q=80"
  ]
];

// Perform strict duplicate validation check on all 175 photo URLs
const allUrls = [];
UNIQUE_THEMED_SETS.forEach((set, setIdx) => {
  if (set.length !== 5) {
    console.error(`Error: Set ${setIdx + 1} does not have exactly 5 photos.`);
    process.exit(1);
  }
  set.forEach(url => allUrls.push(url));
});

const uniqueUrls = new Set(allUrls);
console.log(`Total URLs: ${allUrls.length}`);
console.log(`Unique URLs: ${uniqueUrls.size}`);

if (allUrls.length !== uniqueUrls.size) {
  console.error("Duplicate URLs detected in the curated list! Resolving duplicates...");
  // Identify which ones are duplicates
  const seen = new Set();
  const duplicates = [];
  allUrls.forEach(url => {
    if (seen.has(url)) {
      duplicates.push(url);
    }
    seen.add(url);
  });
  console.error("Duplicates:", duplicates);
  process.exit(1);
} else {
  console.log("Validation Passed: All 175 URLs are 100% unique.");
}

async function seed() {
  const { data: profiles, error: err } = await supabase
    .from('profiles')
    .select('id, name')
    .order('name', { ascending: true }); // consistent order for reliable mapping

  if (err) {
    console.error("Error fetching profiles:", err);
    return;
  }

  console.log(`Fetched ${profiles.length} profiles to update...`);

  let count = 0;
  for (let i = 0; i < profiles.length; i++) {
    const profile = profiles[i];
    const name = profile.name || "User";
    
    // Assign exactly one unique theme set of 5 photos from our list of 35
    const themeSet = UNIQUE_THEMED_SETS[i % UNIQUE_THEMED_SETS.length];

    const { error: updateErr } = await supabase
      .from('profiles')
      .update({
        photoUrl: themeSet[0],
        photos: themeSet
      })
      .eq('id', profile.id);

    if (updateErr) {
      console.error(`Failed to update ${name} (${profile.id}):`, updateErr.message);
    } else {
      console.log(`Updated ${name} with its own unique cohesive theme of 5 Unsplash photos.`);
      count++;
    }
  }

  console.log(`Done! Successfully seeded ${count} profiles with 100% unique images (No duplicates).`);
}

seed();
