/* Interface only; the live adapters, calculation engine and datasets are untouched. */
(()=>{
const palette={
 ATL:['#99182D','#F6D251'], BKN:['#171A20','#B8BCC5'], BOS:['#075335','#52B782'], CHA:['#291B65','#26BEC5'],
 CHI:['#99132F','#17171C'], CLE:['#681C3D','#E6AE38'], DAL:['#103B68','#74ABD8'], DEN:['#172A4E','#FDC43C'],
 DET:['#153985','#E84358'], GS:['#1640A0','#FFCD46'], HOU:['#9D192E','#17171C'], IND:['#142D59','#FDBB30'],
 LAC:['#132F5C','#E5525B'], LAL:['#4C2976','#FBC552'], MEM:['#203957','#87A8D8'], MIA:['#82163B','#F3A650'],
 MIL:['#174734','#E5D7B9'], MIN:['#162D55','#34A977'], NOP:['#182C48','#C3A369'], NY:['#183E7B','#FF9144'],
 OKC:['#006292','#F7845C'], ORL:['#0A4B81','#8EC1EC'], PHI:['#16448A','#F06B83'], PHX:['#352358','#F58D39'],
 POR:['#9D1730','#1C1B21'], SAC:['#4B286B','#BFC3CD'], SAS:['#20242A','#BAC4CA'], TOR:['#881A37','#A4A8AD'],
 UTA:['#44286C','#BCA2F3'], WSH:['#193452','#E8556B']
};
const portraitFraming={"2544":["assets/player-photos/2544-user-meme.png","LeBron James — meme lumineux souriant, tête et buste, image fournie par l’utilisateur.",549,697,[0,0,549,697]],"101108":["assets/player-photos/101108-clean.jpg","Chris Paul — photo d’archive",500,327,[0,0,500,327]],"200768":["assets/player-photos/200768-face-edited.png","Visage de Kyle Lowry sans tenue visible",1270,1239,[238,41,787,1143]],"201142":["assets/player-photos/201142-user-fullbody.png","Kevin Durant, pose choisie par l’utilisateur",1182,1331,[143,6,902,1325]],"201143":["assets/player-photos/201143-user-cutout.png","Al Horford — image fournie par l’utilisateur, fond retiré",1024,1536,[34,21,943,1515]],"201566":["assets/player-photos/201566-civil.png","Russell Westbrook sautant en costume sombre avec un ballon de basket.",1024,1536,[82,8,915,1528]],"201572":["assets/player-photos/201572-user.png","Brook Lopez en tenue Los Angeles Clippers",500,500,[25,8,466,492]],"201599":["assets/player-photos/201599-head.png","DeAndre Jordan, visage sans tenue visible",1274,1234,[90,0,1112,1234]],"201935":["assets/player-photos/201935-user-fullbody.png","James Harden, pose choisie par l’utilisateur",1448,1086,[228,27,1042,1059]],"201939":["assets/player-photos/201939-user-fullbody.png","Stephen Curry, pose choisie par l’utilisateur",1080,1350,[9,6,993,1344]],"201942":["assets/player-photos/201942-head-v2.png","Visage de DeMar DeRozan, grand sourire, fond transparent.",1319,1193,[246,98,849,1007]],"201950":["assets/player-photos/201950-civil.png","Jrue Holiday souriant en vêtements civils à Saving by Shaving en 2024.",1226,1283,[0,126,1226,1157]],"202331":["assets/player-photos/202331-user-cutout.png","Paul George — image fournie par l’utilisateur, fond retiré",1254,1254,[52,19,1094,1235]],"202681":["assets/player-photos/202681-head.png","Tête seule de Kyrie Irving : regard attentif vers le haut et bouche ouverte.",1272,1236,[202,35,907,1146]],"202685":["assets/player-photos/202685-face-edited.png","Visage de Jonas Valanciunas sans tenue visible",1137,1383,[140,0,881,1383]],"202691":["assets/player-photos/202691-face-edited.png","Visage de Klay Thompson sans tenue visible",1263,1246,[205,22,880,1211]],"202695":["assets/player-photos/202695-action.png","Kawhi Leonard dribble en maillot rouge Toronto Raptors.",414,474,[48,0,320,459]],"202696":["assets/player-photos/202696-expression-head.png","Nikola Vučević réagissant, visage sans tenue visible",1226,1283,[171,34,902,1158]],"202699":["assets/player-photos/202699-head.png","Visage de Tobias Harris regardant vers le haut, sans tenue visible.",1264,1244,[191,12,932,1220]],"202710":["assets/player-photos/202710-expressive-head.png","Jimmy Butler, bouche ouverte et regard levé en match, tête seule sans tenue visible.",1263,1246,[205,6,907,1235]],"203076":["assets/player-photos/203076-head.png","Anthony Davis : réaction de profil, sourcils levés et bouche ouverte, sans tenue visible.",1284,1225,[116,3,1094,1222]],"203078":["assets/player-photos/203078-face-edited.png","Visage de Bradley Beal, bandeau NBA sans maillot visible",1358,1158,[253,16,860,1142]],"203081":["assets/player-photos/203081-user-fullbody.png","Damian Lillard, pose choisie par l’utilisateur",1041,1510,[120,129,912,1381]],"203110":["assets/player-photos/203110-user-fullbody.png","Draymond Green, pose choisie par l’utilisateur",887,1774,[0,0,887,1752]],"203114":["assets/player-photos/203114-user-cutout.png","Khris Middleton — image fournie par l’utilisateur, fond retiré",1024,1536,[195,84,661,1401]],"203468":["assets/player-photos/203468-face-edited.png","Visage de CJ McCollum sans tenue visible",1290,1219,[263,0,816,1200]],"203471":["assets/player-photos/203471-expressive-head.png","Dennis Schröder, bouche ouverte et regard levé, visage sans tenue visible",1272,1237,[182,8,902,1172]],"203497":["assets/player-photos/203497-expressive-head.png","Rudy Gobert — tête seule, léger sourire lèvres serrées et regard relevé sous les sourcils",1073,1466,[118,27,840,1417]],"203501":["assets/player-photos/203501-face-edited.png","Visage de Tim Hardaway Jr. sans tenue visible",1287,1222,[199,3,905,1212]],"203507":["assets/player-photos/203507-user-fullbody.png","Giannis Antetokounmpo, pose choisie par l’utilisateur",1121,1403,[198,134,685,1269]],"203897":["assets/player-photos/203897-transparent.png","Zach LaVine — PNG détouré, club actuel",1137,1723,[0,0,1137,1723]],"203903":["assets/player-photos/203903-head.png","Visage expressif de Jordan Clarkson, sans maillot visible.",1293,1216,[209,1,944,1215]],"203924":["assets/player-photos/203924-head.png","Visage expressif de Jerami Grant, sans maillot visible.",1164,1351,[0,0,1164,1351]],"203932":["assets/player-photos/203932-action.png","Aaron Gordon en action ou pose naturelle avec son club actuel",1203,1867,[0,0,1203,1867]],"203935":["assets/player-photos/203935-face-edited.png","Visage de Marcus Smart sans tenue visible",1177,1336,[60,12,1089,1324]],"203944":["assets/player-photos/203944-cutout.png","Visage de Julius Randle sans maillot visible.",1313,1198,[192,21,973,1157]],"203952":["assets/player-photos/203952-head-v2.png","Visage de Andrew Wiggins, grand sourire, fond transparent.",1312,1199,[231,29,886,1164]],"203954":["assets/player-photos/203954-user-fullbody.png","Joel Embiid, pose choisie par l’utilisateur",1672,941,[495,0,757,941]],"203991":["assets/player-photos/203991-head.png","Visage expressif de Clint Capela, sans maillot visible.",1301,1209,[236,27,867,1176]],"203992":["assets/player-photos/203992-head.png","Visage de Bogdan Bogdanović, sans maillot visible.",1133,1388,[85,36,964,1254]],"203994":["assets/player-photos/203994-head.png","Visage de Jusuf Nurkić, sans maillot visible.",1254,1254,[210,7,860,1246]],"203999":["assets/player-photos/203999-user-fullbody.png","Nikola Jokić avec sa carte Joker",1024,1535,[153,30,722,1479]],"204001":["assets/player-photos/204001-face-edited.png","Visage de Kristaps Porziņģis sans tenue visible",1199,1312,[168,0,898,1255]],"1626145":["assets/player-photos/1626145-user-cutout.png","Tyus Jones — image fournie par l’utilisateur, fond retiré",1469,1071,[33,0,1287,1071]],"1626156":["assets/player-photos/1626156-face-edited.png","Visage de D’Angelo Russell sans tenue visible",1187,1325,[99,21,1084,1304]],"1626157":["assets/player-photos/1626157-drost-expressive-head.png","Karl-Anthony Towns, bouche ouverte en action, tête seule issue d’une photographie différente de 2022.",1254,1254,[199,57,999,1120]],"1626162":["assets/player-photos/1626162-face-edited.png","Visage de Kelly Oubre Jr. sans tenue visible",1345,1169,[94,0,1222,1169]],"1626164":["assets/player-photos/1626164-user-fullbody.png","Devin Booker avec sa voiture",1025,1534,[0,223,1025,1101]],"1626167":["assets/player-photos/1626167-head.png","Visage expressif de Myles Turner, sans maillot visible.",1307,1203,[161,5,967,1198]],"1626171":["assets/player-photos/1626171-head-v2.png","Visage de Bobby Portis, yeux écarquillés et bouche ouverte, fond transparent.",1312,1199,[268,46,771,1128]],"1626179":["assets/player-photos/1626179-face-edited.png","Visage de Terry Rozier sans tenue visible",1263,1246,[212,27,812,1140]],"1626181":["assets/player-photos/1626181-head.png","Visage expressif de Norman Powell, sans maillot visible.",1272,1237,[194,45,880,1171]],"1627732":["assets/player-photos/1627732-head.png","Visage de Ben Simmons, bouche ouverte, sans tenue visible.",1132,1389,[65,22,973,1346]],"1627734":["assets/player-photos/1627734-expression-head.png","Domantas Sabonis réagissant, visage sans tenue visible",1080,1457,[68,0,992,1457]],"1627741":["assets/player-photos/1627741-head.png","Visage de Buddy Hield, sans maillot visible.",1285,1224,[182,13,1035,1211]],"1627742":["assets/player-photos/1627742-head-v2.png","Visage de Brandon Ingram, grand sourire, fond transparent.",1308,1203,[275,15,767,1122]],"1627749":["assets/player-photos/1627749-expressive-head.png","Dejounte Murray, visage concentré et bouche ouverte pendant un match, sans tenue visible.",1278,1230,[253,36,833,1158]],"1627750":["assets/player-photos/1627750-head.png","Jamal Murray — tête souriante en célébration, langue visible et regard latéral.",1272,1236,[198,0,924,1236]],"1627751":["assets/player-photos/1627751-head.png","Visage expressif de Jakob Poeltl, sans maillot visible.",1356,1159,[192,40,1034,1057]],"1627759":["assets/player-photos/1627759-head.png","Tête seule de Jaylen Brown : sourire réel de la visite NASA.",1206,1304,[172,10,882,1290]],"1627763":["assets/player-photos/1627763-more-clean.jpg","Malcolm Brogdon — photo d’archive",500,717,[0,0,500,717]],"1627783":["assets/player-photos/1627783-expressive-head.png","Pascal Siakam — tête seule, regard latéral marqué et bouche ouverte",1254,1254,[225,41,851,1213]],"1627826":["assets/player-photos/1627826-head.png","Visage d’Ivica Zubac regardant vers le haut, sans tenue visible.",1174,1340,[110,6,961,1296]],"1627832":["assets/player-photos/1627832-action.png","Fred VanVleet en action ou pose naturelle avec son club actuel",1218,1623,[0,0,1218,1623]],"1627936":["assets/player-photos/1627936-head.png","Tête seule de Alex Caruso : regard attentif vers le haut et bouche entrouverte.",1286,1223,[196,23,928,1189]],"1628368":["assets/player-photos/1628368-transparent.png","De'Aaron Fox — PNG détouré, club actuel",1056,1615,[0,0,1056,1615]],"1628369":["assets/player-photos/1628369-user-fullbody.png","Jayson Tatum, pose choisie par l’utilisateur",1854,1854,[544,361,819,1493]],"1628370":["assets/player-photos/1628370-head.png","Tête seule de Malik Monk : réaction de match, bouche ouverte et regard relevé.",1212,1297,[94,5,1006,1292]],"1628374":["assets/player-photos/1628374-expressive-head.png","Lauri Markkanen — tête seule, langue légèrement sortie sur le côté et regard éveillé",1263,1245,[198,51,863,1101]],"1628378":["assets/player-photos/1628378-expressive-head.png","Donovan Mitchell — tête seule, lèvres pincées, menton et sourcils relevés",1291,1218,[175,46,932,1051]],"1628379":["assets/player-photos/1628379-celebration-head.png","Luke Kennard criant de joie, visage sans tenue visible",1301,1209,[244,1,833,1125]],"1628381":["assets/player-photos/1628381-expressive-head.png","John Collins, tête expressive seule sur fond transparent",1086,1449,[76,0,967,1417]],"1628384":["assets/player-photos/1628384-head.png","Tête seule de OG Anunoby : regard latéral attentif et bouche ouverte.",1293,1217,[174,0,915,1192]],"1628386":["assets/player-photos/1628386-expressive-head.png","Jarrett Allen, tête seule, regard appuyé sous les sourcils et tête baissée en match.",1284,1225,[146,13,1021,1212]],"1628389":["assets/player-photos/1628389-head.png","Bam Adebayo — tête de profil, expression attentive en action, bouche ouverte.",1261,1247,[129,33,1056,1211]],"1628398":["assets/player-photos/1628398-current.png","Kyle Kuzma en maillot blanc des Bucks, les mains sur les hanches.",1463,1639,[0,0,1463,1639]],"1628401":["assets/player-photos/1628401-head.png","Tête seule de Derrick White : regard concentré yeux grands ouverts pendant le dribble.",1308,1203,[252,19,880,1157]],"1628404":["assets/player-photos/1628404-head.png","Tête seule de Josh Hart : regard latéral interrogatif, sourcils froncés et bouche entrouverte.",1101,1428,[62,11,1012,1413]],"1628415":["assets/player-photos/1628415-face-edited.png","Visage de Dillon Brooks sans tenue visible",1139,1381,[116,21,938,1352]],"1628476":["assets/player-photos/1628476-expressive-head.png","Tête de Derrick Walton Jr., lèvres pincées et regard de côté, sans tenue visible",1278,1230,[218,15,862,1172]],"1628960":["assets/player-photos/1628960-user-cutout.png","Grayson Allen — image fournie par l’utilisateur, fond retiré",1155,1362,[46,21,1041,1341]],"1628969":["assets/player-photos/1628969-expressive-head.png","Mikal Bridges, bouche ouverte et sourcils relevés, tête seule sans tenue visible.",1315,1196,[290,34,801,1100]],"1628970":["assets/player-photos/1628970-face-edited.png","Visage de Miles Bridges sans maillot visible",1191,1321,[183,29,826,1251]],"1628973":["assets/player-photos/1628973-expressive-head.png","Jalen Brunson — tête seule, grimace, nez plissé et lèvres serrées",1320,1192,[223,40,940,1063]],"1628976":["assets/player-photos/1628976-action.png","Wendell Carter Jr. avec lunettes de protection, en maillot bleu Orlando Magic.",1099,1559,[0,10,1099,1549]],"1628983":["assets/player-photos/1628983-user-fullbody.png","Shai Gilgeous-Alexander, pose choisie par l’utilisateur",1138,1382,[284,0,574,1382]],"1628991":["assets/player-photos/1628991-head-v2.png","Visage de Jaren Jackson Jr., sourire, fond transparent.",1269,1239,[200,25,871,1199]],"1629008":["assets/player-photos/1629008-face-edited.png","Visage de Michael Porter Jr. sans tenue visible",1136,1385,[97,11,970,1340]],"1629011":["assets/player-photos/1629011-head.png","Visage de Mitchell Robinson, sans maillot visible.",1287,1222,[178,16,902,1200]],"1629012":["assets/player-photos/1629012-head.png","Visage expressif de Collin Sexton, sans maillot visible.",1236,1272,[87,1,1101,1271]],"1629014":["assets/player-photos/1629014-head.png","Visage de Anfernee Simons, sans maillot visible.",1254,1254,[157,38,973,1205]],"1629018":["assets/player-photos/1629018-action.png","Gary Trent Jr. en maillot vert Milwaukee, ballon en mains.",1210,1472,[0,0,1210,1472]],"1629023":["assets/player-photos/1629023-transparent.png","P.J. Washington — PNG détouré, club actuel",1174,1642,[0,0,1174,1642]],"1629027":["assets/player-photos/1629027-head.png","Visage de Trae Young, sans tenue visible.",1306,1205,[219,8,911,1197]],"1629028":["assets/player-photos/1629028-head-v2.png","Visage de Deandre Ayton, éclat de rire, fond transparent.",1261,1247,[207,4,850,1243]],"1629029":["assets/player-photos/1629029-head-smile.png","Luka Dončić souriant, visage sans tenue visible",1269,1240,[238,2,838,1200]],"1629057":["assets/player-photos/1629057-head-v2.png","Visage de Robert Williams III, cri de célébration, fond transparent.",1312,1199,[174,7,978,1191]],"1629614":["assets/player-photos/1629614-expressive-head.png","Andrew Nembhard, langue tirée et tête levée, tête seule sans tenue visible.",1305,1206,[263,63,796,1106]],"1629627":["assets/player-photos/1629627-expressive-head.png","Zion Williamson — tête seule, cri, bouche grande ouverte et yeux plissés",1265,1243,[212,28,859,1161]],"1629628":["assets/player-photos/1629628-head.png","Visage de RJ Barrett, sans maillot visible.",1312,1199,[166,23,1018,1143]],"1629630":["assets/player-photos/1629630-expressive.png","Ja Morant criant de joie, tête détourée avec dreadlocks, sans tenue visible.",1228,1281,[45,15,1139,1261]],"1629632":["assets/player-photos/1629632-expressive-head.png","Visage de Coby White, bouche entrouverte et regard levé vers le panier, sans maillot visible",1312,1199,[287,44,872,1053]],"1629636":["assets/player-photos/1629636-head.png","Visage expressif de Darius Garland, bouche ouverte, sans maillot visible.",1263,1245,[160,33,979,1202]],"1629639":["assets/player-photos/1629639-head.png","Visage de Tyler Herro riant, sans maillot visible.",1277,1232,[138,11,1028,1217]],"1629640":["assets/player-photos/1629640-head.png","Keldon Johnson — tête en célébration, bouche formant un O.",1161,1355,[49,11,1103,1344]],"1629645":["assets/player-photos/1629645-expressive-head.png","Kevin Porter Jr., tête expressive sans tenue visible",1312,1199,[201,49,976,1096]],"1629651":["assets/player-photos/1629651-face-edited.png","Visage de Nic Claxton sans tenue visible",1139,1381,[152,14,863,1348]],"1629655":["assets/player-photos/1629655-head-v2.png","Visage de Daniel Gafford, sourire en match, fond transparent.",1293,1216,[238,66,841,1103]],"1629661":["assets/player-photos/1629661-head.png","Visage de Cameron Johnson tourné vers la gauche, sans tenue visible.",1310,1200,[212,22,969,1178]],"1629673":["assets/player-photos/1629673-head.png","Visage expressif de Jordan Poole, sans maillot visible.",1295,1214,[121,5,1087,1209]],"1630162":["assets/player-photos/1630162-user-head.png","Anthony Edwards, visage criant, tête seule sur fond transparent.",1254,1254,[234,10,819,1234]],"1630163":["assets/player-photos/1630163-head.png","Visage de LaMelo Ball, sans tenue visible.",1291,1218,[163,0,914,1218]],"1630166":["assets/player-photos/1630166-expressive-head.png","Deni Avdija, tête expressive seule sur fond transparent",1195,1316,[214,58,786,1090]],"1630168":["assets/player-photos/1630168-head-v2.png","Visage de Onyeka Okongwu, sourire en match, fond transparent.",1312,1199,[292,48,785,1117]],"1630169":["assets/player-photos/1630169-expression-head.png","Tyrese Haliburton, visage sans tenue visible",1292,1218,[219,5,846,1182]],"1630170":["assets/player-photos/1630170-head.png","Tête seule de Devin Vassell : regard latéral attentif et bouche entrouverte.",1254,1254,[75,5,1156,1249]],"1630178":["assets/player-photos/1630178-expression-head.png","Tyrese Maxey, visage sans tenue visible",1293,1217,[45,3,1243,1214]],"1630180":["assets/player-photos/1630180-user-cutout.png","Saddiq Bey — image fournie par l’utilisateur, fond retiré",1448,1086,[433,87,674,999]],"1630183":["assets/player-photos/1630183-action.png","Jaden McDaniels en action ou pose naturelle avec son club actuel",623,1700,[0,0,623,1700]],"1630193":["assets/player-photos/1630193-expressive-head.png","Tête d’Immanuel Quickley appelant un jeu, bouche entrouverte, sans tenue visible",1289,1221,[162,18,962,1132]],"1630200":["assets/player-photos/1630200-head.png","Visage de Tre Jones, sans maillot visible.",1274,1234,[177,4,972,1162]],"1630217":["assets/player-photos/1630217-head.png","Tête seule de Desmond Bane : regard attentif vers le haut et bouche entrouverte de la photographie originale.",1190,1322,[102,2,986,1265]],"1630224":["assets/player-photos/1630224-clean.jpg","Jalen Green — photo d’archive",500,333,[0,0,500,333]],"1630530":["assets/player-photos/1630530-transparent.png","Trey Murphy III — PNG détouré, club actuel",788,1723,[0,0,788,1723]],"1630532":["assets/player-photos/1630532-expressive-head.png","Franz Wagner — tête seule, sourire de réaction bouche ouverte",1145,1373,[115,26,917,1347]],"1630541":["assets/player-photos/1630541-action.png","Moses Moody en action ou pose naturelle avec son club actuel",1045,1672,[0,0,1045,1672]],"1630552":["assets/player-photos/1630552-face-edited.png","Visage de Jalen Johnson de profil, photographié en 2019",1337,1177,[154,0,1010,1177]],"1630559":["assets/player-photos/1630559-head-v2.png","Visage de Austin Reaves, éclat de rire, tête penchée, fond transparent.",1254,1254,[228,70,874,1117]],"1630567":["assets/player-photos/1630567-expressive-head.png","Scottie Barnes — tête seule, yeux écarquillés et bouche ouverte",1309,1202,[189,30,972,1149]],"1630578":["assets/player-photos/1630578-expression-head.png","Alperen Sengun, visage sans tenue visible",1070,1470,[56,0,1003,1470]],"1630581":["assets/player-photos/1630581-head.png","Tête seule de Josh Giddey : regard latéral attentif et bouche entrouverte.",1339,1174,[26,0,1302,1166]],"1630590":["assets/player-photos/1630590-head.png","Tête de Scotty Pippen Jr., yeux grands ouverts et bouche entrouverte pendant le jeu.",1313,1198,[195,27,891,1079]],"1630591":["assets/player-photos/1630591-user-cutout.png","Jalen Suggs — image fournie par l’utilisateur, fond retiré",1254,1254,[65,64,1124,1190]],"1630595":["assets/player-photos/1630595-head.png","Cade Cunningham — tête en action, sourcils froncés et regard interrogatif.",1314,1197,[125,2,1072,1188]],"1630596":["assets/player-photos/1630596-expressive-head.png","Evan Mobley, tête seule, bouche entrouverte et regard fatigué/concentré en match.",1196,1315,[163,16,910,1299]],"1630611":["assets/player-photos/1630611-head.png","Tête seule de Gui Santos : cri de célébration bouche grande ouverte.",1156,1360,[0,0,1156,1360]],"1630700":["assets/player-photos/1630700-head-v2.png","Visage de Dyson Daniels, sourire, fond transparent.",1312,1199,[177,60,942,1044]],"1630703":["assets/player-photos/1630703-expressive-gesture.png","Scoot Henderson souriant, tête avec la main en cercle devant l’œil",1312,1199,[183,8,973,1134]],"1631094":["assets/player-photos/1631094-cutout.png","Paolo Banchero — photo détourée d’archive",1750,2250,[327,88,1151,2062]],"1631095":["assets/player-photos/1631095-head.png","Tête de Jabari Smith Jr., regard attentif vers le haut et bouche entrouverte.",1274,1235,[210,32,919,1171]],"1631096":["assets/player-photos/1631096-face-edited.png","Visage de Chet Holmgren sans tenue visible",1089,1444,[71,5,973,1375]],"1631097":["assets/player-photos/1631097-head.png","Visage de Bennedict Mathurin regardant vers le haut, sans tenue visible.",1312,1199,[193,25,1000,1079]],"1631099":["assets/player-photos/1631099-head-v2.png","Visage de Keegan Murray, sourire en match, fond transparent.",1306,1204,[273,65,778,1059]],"1631101":["assets/player-photos/1631101-head-v2.png","Visage de Shaedon Sharpe, grand sourire, fond transparent.",1299,1211,[167,20,1039,1153]],"1631105":["assets/player-photos/1631105-head.png","Jalen Duren — tête en action, regard attentif et bouche ouverte.",1265,1243,[238,16,819,1202]],"1631106":["assets/player-photos/1631106-head.png","Tête seule de Tari Eason : cri de célébration yeux fermés et tête relevée.",1346,1169,[110,8,1191,1154]],"1631109":["assets/player-photos/1631109-user-cutout.png","Mark Williams — image fournie par l’utilisateur, fond retiré",1254,1254,[424,172,644,1082]],"1631114":["assets/player-photos/1631114-head.png","Tête seule de Jalen Williams : cri réel, bouche grande ouverte et tête relevée.",1341,1173,[162,8,1120,1144]],"1631117":["assets/player-photos/1631117-expressive-head.png","Walker Kessler, tête expressive sans tenue visible",1179,1334,[95,34,1037,1281]],"1631157":["assets/player-photos/1631157-transparent.png","Ryan Rollins — PNG détouré, club actuel",862,1722,[0,0,862,1722]],"1641705":["assets/player-photos/1641705-head.png","Victor Wembanyama : regard concentré en action, bouche entrouverte, sans tenue visible.",1302,1208,[218,4,855,1204]],"1641706":["assets/player-photos/1641706-head-v2.png","Visage de Brandon Miller, grand sourire, fond transparent.",1312,1199,[315,37,747,1121]],"1641708":["assets/player-photos/1641708-head.png","Visage de Amen Thompson, sans tenue visible.",1317,1194,[143,69,1026,1041]],"1641709":["assets/player-photos/1641709-user-cutout.png","Ausar Thompson — image fournie par l’utilisateur, fond retiré",1254,1254,[24,51,1125,1203]],"1641717":["assets/player-photos/1641717-cutout.png","Cason Wallace — photo détourée d’archive",1600,1700,[179,124,1264,1576]],"1641718":["assets/player-photos/1641718-head.png","Tête seule de Keyonte George : joues gonflées et expression de célébration déterminée.",1199,1312,[96,13,993,1291]],"1641739":["assets/player-photos/1641739-expressive-head.png","Toumani Camara, bouche ouverte et regard attentif levé, tête seule sans tenue visible.",1254,1254,[235,29,847,1177]],"1641744":["assets/player-photos/1641744-head.png","Tête de Zach Edey, regard concentré vers le panier et bouche entrouverte.",1312,1199,[276,29,848,1149]],"1641759":["assets/player-photos/1641759-expressive-head.png","Visage de Dillon Mitchell regardant vers le haut, bouche ouverte, sans tenue visible",1362,1155,[163,16,1100,1078]],"1642259":["assets/player-photos/1642259-transparent.png","Alex Sarr — PNG détouré, club actuel",1792,1863,[0,0,1792,1863]],"1642264":["assets/player-photos/1642264-head-v2.png","Visage de Stephon Castle, éclat de rire, fond transparent.",1024,1536,[127,1,864,1484]],"1642270":["assets/player-photos/1642270-user-cutout.png","Donovan Clingan — image fournie par l’utilisateur, fond retiré",1254,1254,[0,0,1195,1254]],"1642271":["assets/player-photos/1642271-transparent.png","Kyle Filipowski — PNG détouré, club actuel",1090,1723,[0,0,1090,1723]],"1642276":["assets/player-photos/1642276-head.png","Visage expressif de Kel’el Ware, sans maillot visible.",1261,1247,[157,23,981,1209]],"1642394":["assets/player-photos/1642394-expressive-head-v2.png","Tête de Baba Miller, bouche entrouverte pendant une action, sans tenue visible",1349,1166,[194,30,946,1068]],"1642843":["assets/player-photos/1642843-head-v2.png","Visage de Cooper Flagg, langue tirée, fond transparent.",1267,1241,[227,16,823,1193]],"1642845":["assets/player-photos/1642845-head.png","Visage de VJ Edgecombe, sans tenue visible.",1324,1188,[279,34,838,1057]],"1642851":["assets/player-photos/1642851-user.png","Kon Knueppel en tenue Charlotte Hornets",1024,1024,[25,0,999,1024]],"1642852":["assets/player-photos/1642852-head.png","Visage expressif de Derik Queen, sans maillot visible.",1085,1449,[73,9,1005,1420]],"1642863":["assets/player-photos/1642863-user-cutout.png","Khaman Maluach — image fournie par l’utilisateur, fond retiré",1254,1254,[391,0,499,1254]],"1642882":["assets/player-photos/1642882-head.png","Visage expressif de Julian Reese, sans maillot visible.",1278,1230,[147,3,1053,1227]],"1643516":["assets/player-photos/1643516-head.png","Morez Johnson Jr., tête seule, expression concentrée bouche entrouverte.",1452,1083,[224,23,1014,1002]],"1643520":["assets/player-photos/1643520-expressive-head.png","Visage expressif de Koa Peat, bouche ouverte, sans tenue visible",1347,1168,[179,23,1032,1132]],"1643553":["assets/player-photos/1643553-head.png","Ryan Conwell, tête levée en action avec protège-dents visible.",1254,1254,[86,32,1146,1195]],"1643558":["assets/player-photos/1643558-expressive-head.png","Tête de Jaden Bradley, bouche ouverte et regard vers le panier, sans tenue visible",1330,1182,[296,84,843,987]],"1643576":["assets/player-photos/1643576-expressive-head.png","Visage de Maliq Brown bouche ouverte, sans tenue visible",1501,1047,[328,0,1037,1047]],"1641726":["assets/player-photos/1641726-head.png","Dereck Lively II riant, tête détourée",1254,1254,[77,21,1113,1211]],"1641764":["assets/player-photos/1641764-head.png","Brandin Podziemski souriant, tête détourée",1312,1199,[185,52,969,1085]],"1628392":["assets/player-photos/1628392-head.png","Isaiah Hartenstein souriant, tête détourée",1312,1199,[286,40,792,1120]],"201144":["assets/player-photos/201144-head.png","Mike Conley souriant, tête détourée",1312,1199,[291,60,794,1107]],"1627747":["assets/player-photos/1627747-head.png","Caris LeVert souriant, tête détourée",1312,1199,[285,58,775,1000]],"1642907":["assets/player-photos/1642907-head.png","Cedric Coward souriant, tête détourée",1341,1173,[284,53,806,1026]],"1642847":["assets/player-photos/1642847-head.png","Jeremiah Fears souriant, tête détourée",1312,1199,[221,64,874,1026]],"1626174":["assets/player-photos/1626174-head.png","Christian Wood souriant, tête détourée",1312,1199,[121,37,1027,1099]],"1628366":["assets/player-photos/1628366-head.png","Lonzo Ball souriant, tête détourée",1293,1216,[254,87,807,1025]],"1629658":["assets/player-photos/1629658-head.png","Jaylen Hoard souriant, tête détourée",1295,1214,[222,19,872,1178]],"1629675":["assets/player-photos/1629675-head.png","Naz Reid riant, tête détourée",1312,1199,[309,30,712,1156]],"1642273":["assets/player-photos/1642273-head.png","Kyshawn George riant, tête détourée",1331,1181,[214,22,1009,1100]],"1641824":["assets/player-photos/1641824-head.png","Matas Buzelis souriant, tête détourée",1314,1197,[189,16,940,1121]],"204456":["assets/player-photos/204456-head.png","T.J. McConnell souriant, tête détourée",1314,1197,[296,22,820,1100]],"1631093":["assets/player-photos/1631093-head.png","Jaden Ivey souriant, tête détourée",1302,1208,[258,4,885,1167]],"1642268":["assets/player-photos/1642268-head.png","Isaiah Collier souriant, tête détourée",1536,1024,[340,53,828,887]],"1642844":["assets/player-photos/1642844-head.png","Dylan Harper souriant, tête détourée",1254,1254,[92,24,1126,1129]],"1631170":["assets/player-photos/1631170-head.png","Jaime Jaquez Jr. souriant, tête détourée",1347,1167,[142,36,1068,1090]],"1628989":["assets/player-photos/1628989-head.png","Kevin Huerter souriant, tête détourée",1312,1199,[269,80,780,970]],"1641731":["assets/player-photos/1641731-head.png","Bilal Coulibaly souriant, tête détourée",1312,1199,[172,50,985,1077]],"1629001":["assets/player-photos/1629001-head.png","De'Anthony Melton, tête expressive détourée",1313,1198,[250,41,818,1147]],"1642875":["assets/player-photos/1642875-head.png","Maxime Raynaud, tête expressive détourée",1295,1215,[204,16,938,1115]],"1642846":["assets/player-photos/1642846-head.png","Ace Bailey, tête expressive détourée",1283,1226,[237,38,845,1174]],"1630245":["assets/player-photos/1630245-head.png","Ayo Dosunmu, tête expressive détourée",1303,1207,[160,27,1041,1148]],"1630175":["assets/player-photos/1630175-head.png","Cole Anthony, tête souriante détourée",1359,1157,[211,2,953,1155]],"1630583":["assets/player-photos/1630583-head.png","Santi Aldama, tête souriante détourée",1315,1196,[301,59,754,1030]],"1629631":["assets/player-photos/1629631-head.png","De'Andre Hunter, tête expressive détourée",1269,1240,[283,37,708,1163]],"1626220":["assets/player-photos/1626220-head.png","Royce O'Neale, tête expressive détourée",1286,1223,[263,8,778,1215]],"1628365":["assets/player-photos/1628365-head.png","Markelle Fultz, tête expressive détourée",1280,1229,[223,0,989,1229]],"1642867":["assets/player-photos/1642867-head.png","Collin Murray-Boyles, tête riant détourée",1294,1216,[175,41,940,1089]],"1642955":["assets/player-photos/1642955-head.png","Kadary Richmond, tête expressive détourée",1268,1241,[73,5,1130,1179]],"1643016":["assets/player-photos/1643016-head.png","Bez Mbeng, tête expressive détourée",1290,1219,[199,25,934,1172]],"1642504":["assets/player-photos/1642504-head.png","Cormac Ryan, tête expressive détourée",1371,1148,[287,21,921,1004]],"1630202":["assets/player-photos/1630202-head.png","Payton Pritchard, tête expressive détourée",1312,1199,[230,32,865,1080]],"1642285":["assets/player-photos/1642285-head.png","Cam Spencer, tête expressive détourée",1286,1223,[152,0,982,1219]],"203084":["assets/player-photos/203084-head.png","Harrison Barnes, tête expressive détourée",1262,1246,[190,0,913,1246]],"1642267":["assets/player-photos/1642267-head.png","Bub Carrington souriant, tête détourée",1312,1199,[101,0,1148,1189]],"1642263":["assets/player-photos/1642263-head.png","Reed Sheppard souriant, tête détourée",1306,1204,[143,3,1082,1153]],"1641750":["assets/player-photos/1641750-head.png","Ryan Kalkbrenner, tête expressive détourée",1303,1207,[266,32,787,1169]],"1627739":["assets/player-photos/1627739-head.png","Kris Dunn criant, tête détourée",1143,1376,[90,9,967,1301]],"1642928":["assets/player-photos/1642928-head.png","Dylan Cardwell souriant, tête détourée",1293,1217,[193,60,849,1051]],"1630631":["assets/player-photos/1630631-head.png","Jose Alvarado souriant, tête détourée",1264,1244,[169,8,913,1236]],"1630191":["assets/player-photos/1630191-head.png","Isaiah Stewart, tête souriante détourée",1305,1205,[179,3,954,1202]],"1629652":["assets/player-photos/1629652-head.png","Luguentz Dort, tête souriante détourée",1284,1225,[240,37,897,1111]],"1629060":["assets/player-photos/1629060-head.png","Rui Hachimura, tête expressive détourée",1274,1234,[262,3,750,1198]],"1629656":["assets/player-photos/1629656-head.png","Quentin Grimes, tête expressive détourée",1268,1240,[196,12,864,1194]],"1642349":["assets/player-photos/1642349-head.png","Ajay Mitchell, tête expressive détourée",1292,1218,[167,63,966,1082]],"1631221":["assets/player-photos/1631221-head.png","Collin Gillespie, tête expressive détourée",1263,1246,[267,39,800,1081]],"203937":["assets/player-photos/203937-head.png","Kyle Anderson, tête expressive détourée",1269,1240,[214,64,849,1118]],"203484":["assets/player-photos/203484-head.png","Kentavious Caldwell-Pope, tête expressive détourée",1275,1234,[214,29,844,1145]],"1628971":["assets/player-photos/1628971-head.png","Bruce Brown, tête expressive détourée",1266,1243,[213,15,817,1224]],"1629622":["assets/player-photos/1629622-head.png","Max Strus, tête expressive détourée",1281,1228,[224,60,848,1107]],"1642914":["assets/player-photos/1642914-head.png","Javon Small, tête expressive détourée",1261,1247,[238,26,798,1217]],"1642274":["assets/player-photos/1642274-head.png","Yves Missi, tête expressive détourée",1281,1228,[245,43,810,1127]],"1642856":["assets/player-photos/1642856-head.png","Egor Dëmin, tête expressive détourée",1313,1198,[290,42,759,1129]],"203482":["assets/player-photos/203482-head.png","Kelly Olynyk, tête expressive détourée",1524,1032,[235,19,1105,1005]],"1643158":["assets/player-photos/1643158-head.png","Andersson Garcia, tête expressive détourée",1346,1169,[168,6,1094,1154]],"1631351":["assets/player-photos/1631351-head.png","Lucas Williamson, tête expressive détourée",1312,1199,[245,24,822,1079]],"1628419":["assets/player-photos/1628419-head.png","Cameron Oliver, tête expressive détourée",1312,1199,[209,45,865,1130]],"1643133":["assets/player-photos/1643133-head.png","Lawson Lovering, tête expressive détourée",1305,1206,[255,31,834,1109]],"1642380":["assets/player-photos/1642380-head.png","Adama Bal, tête expressive détourée",1325,1187,[190,33,943,1043]],"1628380":["assets/player-photos/1628380-head.png","Zach Collins, tête expressive détourée",1312,1199,[237,33,851,1089]],"1630228":["assets/player-photos/1630228-head.png","Jonathan Kuminga, tête expressive détourée",1312,1199,[255,52,850,1096]],"1631110":["assets/player-photos/1631110-head.png","Jeremy Sochan, tête expressive détourée",1297,1213,[257,33,875,1135]],"1631128":["assets/player-photos/1631128-head.png","Christian Braun, tête expressive détourée",1291,1218,[234,29,843,1097]],"203083":["assets/player-photos/203083-head.png","Andre Drummond, tête expressive détourée",1292,1217,[194,101,954,1036]],"1628963":["assets/player-photos/1628963-head.png","Marvin Bagley III, tête expressive détourée",1312,1199,[76,11,1176,1176]],"1630188":["assets/player-photos/1630188-head.png","Jalen Smith, tête expressive détourée",1292,1217,[194,33,957,1111]],"1641869":["assets/player-photos/1641869-head.png","Malachi Smith : tête détourée, expression de match",1312,1199,[309,51,728,1089]],"1630542":["assets/player-photos/1630542-head.png","Marcus Bagley : tête détourée, expression de match",1262,1246,[267,44,744,1125]],"1643052":["assets/player-photos/1643052-head.png","Chaney Johnson : tête détourée, expression de match",1313,1198,[65,23,1203,1162]],"1627736":["assets/player-photos/1627736-head.png","Malik Beasley : tête détourée, expression de match",1329,1183,[213,100,930,963]],"1629660":["assets/player-photos/1629660-head.png","Ty Jerome : tête détourée, grand sourire",1310,1200,[248,16,866,1129]],"1630560":["assets/player-photos/1630560-head.png","Cam Thomas : tête détourée, regard perplexe",1323,1189,[112,36,1105,1082]],"1642258":["assets/player-photos/1642258-head.png","Zaccharie Risacher : tête détourée, regard levé et bouche ouverte",1290,1219,[240,51,821,1053]],"1630230":["assets/player-photos/1630230-head.png","Naji Marshall : tête détourée, expression de match",1266,1242,[0,17,1244,1225]],"1630173":["assets/player-photos/1630173-head.png","Precious Achiuwa : tête détourée, expression de match",1275,1234,[0,21,1239,1213]],"1641710":["assets/player-photos/1641710-head.png","Anthony Black : tête détourée, expression en match ou interview",1296,1213,[0,28,1272,1185]],"1641713":["assets/player-photos/1641713-head.png","GG Jackson, bouche ouverte et tête détourée transparente",1382,1138,[0,21,1362,1117]],"1631212":["assets/player-photos/1631212-head.png","Peyton Watson souriant, tête détourée sur fond transparent",1312,1199,[65,37,1171,1115]],"1630577":["assets/player-photos/1630577-head.png","Julian Champagnie souriant, tête détourée sur fond transparent",1310,1200,[0,24,1296,1176]],"1630174":["assets/player-photos/1630174-head.png","Aaron Nesmith criant, tête détourée transparente",1381,1139,[0,19,1367,1104]],"1627827":["assets/player-photos/1627827-head.png","Dorian Finney-Smith regardant vers le haut, tête détourée transparente",1283,1226,[0,19,1263,1189]],"1628998":["assets/player-photos/1628998-head.png","Cody Martin légèrement souriant, tête détourée transparente",1296,1214,[0,0,1280,1214]],"1628420":["assets/player-photos/1628420-head.png","Monte Morris, expression interrogative, tête détourée",1262,1246,[0,19,1242,1227]],"1629674":["assets/player-photos/1629674-head.png","Neemias Queta, langue au coin de la bouche, tête détourée",1319,1192,[0,15,1305,1177]],"1642377":["assets/player-photos/1642377-head.png","Jaylen Wells, yeux fermés et bouche ouverte, tête détourée",1307,1203,[0,15,1306,1188]],"1629130":["assets/player-photos/1629130-head.png","Duncan Robinson, bouche ouverte, tête détourée",1261,1247,[0,25,1245,1198]],"1626172":["assets/player-photos/1626172-head.png","Kevon Looney, regard attentif vers le haut, tête détourée",1327,1186,[0,19,1326,1167]],"1630314":["assets/player-photos/1630314-head.png","Brandon Williams, bouche ouverte et regard vers le haut, tête détourée",1313,1198,[25,20,1234,1156]],"1642874":["assets/player-photos/1642874-head.png","Danny Wolf, sourire et regard baissé, tête détourée",1301,1209,[0,8,1300,1201]],"1628964":["assets/player-photos/1628964-head.png","Mo Bamba, grimace de célébration bouche ouverte, tête détourée",1296,1213,[0,15,1276,1198]],"202692":["assets/player-photos/202692-head.png","Alec Burks, large sourire, tête détourée",1295,1214,[0,26,1275,1188]],"1631232":["assets/player-photos/1631232-head.png","Keion Brooks Jr., bouche ouverte et regard latéral, tête détourée",1271,1237,[0,0,1243,1237]],"1642272":["assets/player-photos/1642272-head-manual.png","Jared McCain souriant, tête détourée sur fond transparent",1778,1778,[181,62,1415,1654]]};
const alias={GSW:'GS',NYK:'NY',WAS:'WSH',BRK:'BKN',NO:'NOP',NOR:'NOP',PHO:'PHX',SA:'SAS',UTAH:'UTA'};
const club=t=>alias[t]||t;
const games=new Map(currentData.games.map(g=>[g.id,g]));
const box=()=>el('view');
const dayFmt=new Intl.DateTimeFormat('fr-FR',{day:'numeric',month:'long',year:'numeric',timeZone:'UTC'});
const dateLabel=d=>d?dayFmt.format(new Date(d+'T12:00:00Z')):'';
const night=g=>window.FantasyDashboard.nightDate(g.start);
const counts=new Map();
const seasonGames=currentData.games.filter(g=>g.status==='finished'&&g.type==='regular'&&g.league==='standard');
for(const g of seasonGames){const d=night(g);if(!counts.has(d))counts.set(d,[]);counts.get(d).push(g);}
const nights=[...counts.keys()].sort().reverse();
let scoreNight=nights[0], matchId=null, matchSide='away', nextRoute=0, restoring=false, ready=false;
const snapshots=new Map();
const theme=(node,t)=>{if(!node)return;const k=club(t),[bg,trim]=palette[k]||['#293346','#8090a9'];node.dataset.courtClub=palette[k]?k:'';node.style.setProperty('--court-team',bg);node.style.setProperty('--court-trim',trim);};
const logo=t=>Object.hasOwn(palette,club(t))?`<img class="court-logo" width="25" height="25" src="assets/courtside/${club(t)}.svg" alt="" decoding="async">`:'';
const nameFor=(g,t)=>t===g.away?'away':'home';
const subnav=(links,klass)=>{const n=document.createElement('nav');n.className=klass;n.setAttribute('aria-label','Sections de la fiche');for(const [label,target] of links){if(!target)continue;const b=document.createElement('button');b.type='button';b.textContent=label;b.onclick=()=>{if(target.tagName==='DETAILS')target.open=true;target.scrollIntoView({block:'start',behavior:'instant'});};n.append(b);}return n;};
function scoreList(){
 const area=el('courtScores'), rows=(counts.get(scoreNight)||[]).slice().sort((a,b)=>a.start.localeCompare(b.start));
 const found=rows.filter(g=>g.statsState==='available').length;
 area.innerHTML=`<div class="court-score-meta"><span>${found} / ${rows.length} feuilles disponibles · matchs connus</span><span class="court-score-status">${!rows.length?'Aucune donnée':found===rows.length?'Feuilles disponibles':'Soirée partielle'}</span></div><div class="court-score-track" aria-label="Résultats de la soirée">${rows.map(g=>`<button type="button" data-court-game="${g.id}"><span>${logo(g.away.code)}${esc(g.away.code)} <b>${g.finalScores?.[1]??'—'}</b></span><span>${logo(g.home.code)}${esc(g.home.code)} <b>${g.finalScores?.[0]??'—'}</b></span></button>`).join('')}</div>`;
 area.querySelectorAll('button').forEach(b=>b.onclick=()=>openMatch(Number(b.dataset.courtGame)));
}
function home(){
 const mast=box().querySelector('.hero');
 mast.insertAdjacentHTML('afterbegin','<p class="court-kicker">Basket · Fantasy · Trades</p>');
 for(const b of box().querySelectorAll('.dashboard-periods [data-period]')){b.setAttribute('aria-label',b.textContent);b.textContent=b.dataset.period==='available'?'Soirée':b.dataset.period+' jours';}
 if(!nights.length)return;
 box().querySelector('.hero').insertAdjacentHTML('afterend',`<section class="court-scoreboard" aria-label="Scores"><div class="court-section-head"><div><span class="eyebrow">SCOREBOARD</span><h2>Scores de la soirée</h2></div><label for="courtNight">Date NBA <select id="courtNight">${nights.map(d=>`<option value="${d}"${scoreNight===d?' selected':''}>${dateLabel(d)}</option>`).join('')}</select></label></div><div id="courtScores"></div></section>`);
 el('courtNight').onchange=e=>{scoreNight=e.target.value;scoreList();};
 scoreList();
}
function editorialLayout(rows){
 const body=el('dashboardBody'), slider=el('dashboardCarousel'), table=body.querySelector('.dashboard-table-wrap'), title=el('dashboardComplete');
 const footer=document.createElement('div');footer.className='cs-feature-footer';
 footer.append(slider.querySelector('.dashboard-carousel-heading'),slider.querySelector('.dashboard-carousel-controls'));
 slider.append(footer);
 const layout=document.createElement('div');layout.className='cs-courtside';
 const top=document.createElement('section');top.className='cs-top';
 title.textContent='Top '+rows.length;
 for(const [i,r] of rows.entries()){
  const cell=table.querySelectorAll('tbody th')[i], lg=logo(matchTeam(r)||r.teams.at(-1));
  if(lg)cell?.insertAdjacentHTML('afterbegin',lg);
 }
 const link=el('dashboardRankings');top.append(title,table,link);
 body.append(layout);layout.append(slider,top);
 const editions=document.createElement('nav');editions.className='cs-editions';editions.setAttribute('aria-label','Éditions joueur');
 editions.innerHTML='<b>Éditions joueur</b>'+[[1642270,'Clingan'],[2544,'LeBron'],[201142,'KD'],[203081,'Dame Time'],[1630166,'Voldemort']].map(([id,label])=>`<button type="button" class="text-button" data-cs-edition="${id}">${label}</button>`).join('');
 editions.querySelectorAll('button').forEach(b=>b.onclick=()=>openPlayer(b.dataset.csEdition));body.append(editions);
}
function matchTeam(r){const g=games.get(r.latestMatch?.gameId);return g?(r.latestMatch.home?g.home.code:g.away.code):null;}
// NB: these links are only for the existing portrait asset. All match and trade
// actions continue to use the exact provider key in r.id.
const spotlightAliases={
 'highlightly:56':['Jaden McDaniels',1630183],'highlightly:139':['Scottie Barnes',1630567],
 'highlightly:393':['Tyler Herro',1629639],'highlightly:355':['Shai Gilgeous-Alexander',1628983],
 'highlightly:380':['Stephon Castle',1642264],'highlightly:4':['Devin Booker',1626164],
 'highlightly:377':['Victor Wembanyama',1641705],'highlightly:17':['Nikola Jokic',203999],
 'highlightly:111':['Giannis Antetokounmpo',203507],'highlightly:233':['Karl-Anthony Towns',1626157],
 'highlightly:113':['Bam Adebayo',1628389],'highlightly:222':['Joel Embiid',203954],
 'highlightly:84':['P.J. Washington',1629023],'highlightly:151':['Franz Wagner',1630532],
 'highlightly:75924692':['Kon Knueppel',1642851],
 'highlightly:76595312':['Dillon Mitchell',1641759],'highlightly:552':['Dillon Mitchell',1641759]
};
// Day-to-day imports can expose a pending provider key instead of the NBA
// key. Reuse approved artwork only when the official current registry and
// historic list agree on one exact name, without changing any stat identity.
function buildPortraitLinks(){
 const historyNames=new Map(),currentNames=new Map(),pendingNames=new Map();
 const record=(index,name,id)=>{const key=normalized(name);let ids=index.get(key);if(!ids)index.set(key,ids=new Set());ids.add(id);};
 for(const [id,name] of window.__DATASET.players)record(historyNames,name,id);
 for(const p of currentData.players)record(p.nbaId==null?pendingNames:currentNames,p.name,p.nbaId??C.playerKeyFor(p));
 const entries=new Map();
 for(const [name,keys] of pendingNames){
   const h=historyNames.get(name),live=currentNames.get(name);
   if(keys.size!==1||h?.size!==1||live?.size!==1)continue;
   const [id]=h;
   if(id!==1630166&&live.has(id)&&Object.hasOwn(portraitFraming,id))entries.set([...keys][0],[name,id]);
 }
 return entries;
}
const verifiedPortraitLinks=buildPortraitLinks();
function spotlightArtId(r){
 const link=spotlightAliases[r.id]||verifiedPortraitLinks.get(r.id);
 return link&&normalized(r.name)===normalized(link[0])?link[1]:artId({player_id:r.id,full_name:r.name});
}
// Display-only outlines for approved ordinary portraits originally delivered as
// full photos. Preserve original pixels, artwork, registration, and credits.
const ordinaryFaceFrames={
 203932:[415.04,0,535.33,522.76,'M415.04 224.04L445.11 158.69L481.2 121.36L535.34 74.68L607.51 18.67L691.73 0L787.97 9.34L860.14 37.34L908.26 102.69L926.31 177.37L938.34 289.38L944.36 392.07L950.37 457.42L920.29 457.42L902.25 494.75L872.17 494.75L854.13 466.75L830.07 494.75L818.04 448.08L800 429.41L781.95 438.75L757.89 476.08L721.8 504.09L655.63 522.76L595.49 513.42L565.41 485.42L553.38 448.08L517.29 438.75L499.25 410.74L481.2 429.41L475.19 392.07L451.12 392.07L457.14 308.06L487.21 205.37L457.14 224.04L433.08 242.71Z'], // Aaron Gordon
 201143:[419.84,38.4,215.04,284.16,'M419.84 176.64L430.08 115.2L455.68 69.12L506.88 38.4L552.96 38.4L599.04 61.44L619.52 99.84L634.88 176.64L624.64 230.4L593.92 261.12L568.32 299.52L522.24 322.56L481.28 299.52L455.68 268.8L424.96 245.76Z'], // Al Horford
 1642259:[654.08,0,465.92,614.79,'M654.08 232.88L663.04 121.09L716.8 65.2L797.44 18.63L904.96 0L994.56 9.31L1066.24 46.58L1102.08 111.78L1102.08 186.3L1120 223.56L1111.04 316.71L1084.16 363.29L1066.24 437.81L1057.28 493.69L1039.36 549.59L1012.48 596.16L967.68 614.79L931.84 605.48L896 577.53L851.2 512.33L824.32 447.12L788.48 372.6L752.64 381.92L716.8 447.12L680.96 447.12L663.04 400.55L663.04 335.34Z'], // Alex Sarr
 1641709:[426.36,68.97,369.93,319.77,'M432.63 194.37L438.9 156.75L470.25 131.67L495.33 106.59L551.76 75.24L614.46 68.97L664.62 68.97L721.05 87.78L752.4 125.4L771.21 181.83L771.21 282.15L777.48 326.04L790.02 357.39L796.29 382.47L783.75 382.47L771.21 363.66L771.21 388.74L758.67 388.74L746.13 363.66L739.86 344.85L727.32 326.04L714.78 326.04L702.24 338.58L683.43 351.12L658.35 363.66L627 369.93L589.38 376.2L545.49 376.2L507.87 369.93L482.79 357.39L457.71 338.58L451.44 313.5L438.9 288.42L445.17 263.34L426.36 238.26L432.63 213.18Z'], // Ausar Thompson
 201572:[177.5,7.5,127.5,205,'M190 100L190 62.5L195 32.5L205 17.5L227.5 7.5L252.5 7.5L272.5 15L290 30L297.5 52.5L297.5 85L305 97.5L305 122.5L297.5 145L292.5 165L282.5 182.5L270 200L252.5 212.5L232.5 212.5L215 197.5L200 180L190 155L182.5 140L177.5 115L180 100Z'], // Brook Lopez
 1641717:[616,136,776,518.5,'M616 331.5L640 263.5L688 212.5L736 170L808 144.5L888 136L952 144.5L1000 178.5L1040 238L1064 331.5L1080 416.5L1112 476L1168 535.5L1232 569.5L1296 612L1376 620.5L1392 637.5L1352 654.5L1296 646L1240 620.5L1184 603.5L1128 586.5L1080 552.5L1032 544L984 527L944 535.5L904 510L888 467.5L864 476L856 535.5L824 586.5L768 603.5L704 578L680 535.5L664 476L656 416.5L624 391Z'], // Cason Wallace
 101108:[227.5,47.41,52.5,57.23,'M230 62.13L235 55.59L245 49.05L255 47.41L267.5 50.69L275 55.59L280 63.77L280 76.84L277.5 86.66L270 91.56L267.5 99.73L260 104.64L255 103L252.5 98.1L250 93.19L245 89.92L242.5 91.56L240 93.19L240 96.47L235 98.1L230 94.83L227.5 86.66L230 80.11L230 75.21L227.5 70.31Z'], // Chris Paul
 1628368:[353.76,0,316.8,403.75,'M359.04 145.35L359.04 96.9L380.16 56.52L422.4 24.23L475.2 8.07L528 0L586.08 0L633.6 16.15L654.72 48.45L660 96.9L654.72 177.65L665.28 185.72L670.56 226.1L660 274.55L633.6 298.77L617.76 339.15L596.64 371.45L554.4 395.68L517.44 403.75L469.92 387.6L432.96 363.38L406.56 331.07L390.72 298.77L385.44 266.48L364.32 242.25L353.76 201.88L359.04 169.57Z'], // De'Aaron Fox
 1642270:[489.06,6.27,332.31,438.9,'M489.06 68.97L526.68 25.08L601.92 12.54L683.43 6.27L752.4 31.35L808.83 81.51L821.37 169.29L815.1 244.53L777.48 307.23L733.59 357.39L683.43 407.55L633.27 445.17L589.38 445.17L551.76 420.09L520.41 382.47L501.6 338.58L514.14 288.42L495.33 250.8L501.6 194.37L489.06 169.29Z'], // Donovan Clingan
 1627832:[170.52,8.12,383.67,616.74,'M170.52 137.96L213.15 56.8L304.5 16.23L395.85 8.12L481.11 40.58L535.92 89.27L554.19 194.76L548.1 332.71L529.83 397.63L554.19 446.32L529.83 535.59L505.47 576.16L432.39 616.74L347.13 624.86L274.05 608.62L207.06 551.82L182.7 486.9L176.61 413.87L170.52 308.37Z'], // Fred VanVleet
 1629018:[580.8,14.72,356.95,412.16,'M598.95 147.2L623.15 73.6L683.65 29.44L798.6 14.72L883.3 29.44L925.65 66.24L937.75 139.84L919.6 220.8L883.3 287.04L859.1 323.84L816.75 375.36L762.3 419.52L701.8 426.88L653.4 397.44L611.05 353.28L592.9 287.04L580.8 235.52Z'], // Gary Trent Jr.
 1628960:[473.55,20.43,236.78,347.31,'M485.1 95.34L513.98 47.67L571.73 20.43L641.02 20.43L687.23 47.67L710.33 95.34L710.33 197.49L698.77 245.16L675.67 292.83L635.25 347.31L594.83 367.74L548.62 347.31L513.98 306.45L490.88 251.97L473.55 197.49Z'], // Grayson Allen
 1630224:[220,76.59,57.5,84.91,'M222.5 93.24L232.5 79.92L245 76.59L257.5 79.92L265 86.58L270 93.24L275 103.23L277.5 113.22L277.5 123.21L275 133.2L267.5 141.53L262.5 151.51L255 159.84L247.5 161.5L240 156.51L232.5 146.52L230 138.19L227.5 129.87L225 123.21L222.5 116.55L220 108.22Z'], // Jalen Green
 1630591:[514.14,100.32,244.53,376.2,'M520.41 213.18L545.49 150.48L595.65 112.86L658.35 100.32L708.51 119.13L752.4 156.75L758.67 219.45L752.4 300.96L727.32 382.47L695.97 432.63L658.35 470.25L620.73 476.52L583.11 438.9L551.76 382.47L532.95 319.77L514.14 275.88Z'], // Jalen Suggs
 201950:[110.34,76.98,772.38,866.02,'M110.34 314.33L183.9 205.28L281.98 160.38L269.72 109.06L343.28 173.21L441.36 147.54L398.45 76.98L472.01 153.96L557.83 147.54L668.17 179.62L655.91 134.72L723.34 166.79L735.6 198.87L778.51 230.94L821.42 288.68L882.72 365.65L858.2 397.73L790.77 340L766.25 404.14L772.38 500.37L747.86 570.93L729.47 667.16L692.69 763.38L649.78 853.2L588.48 910.93L508.79 943L429.1 923.76L349.41 878.86L294.24 814.71L251.33 737.73L220.68 679.99L190.03 596.6L165.51 513.2L171.64 436.22L153.25 352.82Z'], // Jrue Holiday
 202695:[219.42,0,70.38,80.58,'M233.91 35.55L233.91 21.33L240.12 9.48L248.4 4.74L258.75 0L269.1 0L279.45 2.37L285.66 14.22L289.8 23.7L289.8 40.29L287.73 52.14L281.52 63.99L279.45 68.73L273.24 78.21L264.96 80.58L256.68 75.84L250.47 66.36L246.33 54.51L242.19 49.77L238.05 52.14L231.84 52.14L225.63 49.77L219.42 49.77L223.56 47.4L231.84 42.66Z'], // Kawhi Leonard
 1642863:[520.41,12.54,206.91,231.99,'M532.95 81.51L570.57 37.62L620.73 12.54L664.62 18.81L708.51 50.16L727.32 100.32L721.05 144.21L689.7 194.37L658.35 231.99L620.73 244.53L583.11 225.72L545.49 188.1L520.41 144.21Z'], // Khaman Maluach
 203114:[419.84,99.84,148.48,184.32,'M440.32 161.28L450.56 130.56L476.16 107.52L501.76 99.84L527.36 107.52L547.84 122.88L558.08 153.6L552.96 176.64L568.32 192L563.2 215.04L542.72 230.4L532.48 253.44L512 276.48L486.4 284.16L465.92 268.8L450.56 245.76L440.32 222.72L424.96 215.04L419.84 192L424.96 168.96Z'], // Khris Middleton
 1642851:[327.68,0,327.68,389.12,'M327.68 128L358.4 66.56L409.6 20.48L460.8 0L522.24 0L583.68 10.24L629.76 46.08L655.36 87.04L650.24 148.48L624.64 225.28L604.16 281.6L568.32 332.8L522.24 373.76L465.92 389.12L414.72 363.52L384 322.56L363.52 281.6L363.52 250.88L337.92 230.4L348.16 184.32Z'], // Kon Knueppel
 1642271:[654,0,337.9,551.36,'M654 129.22L681.25 51.69L735.75 17.23L795.7 0L877.45 17.23L953.75 43.08L991.9 86.15L991.9 155.07L975.55 249.84L991.9 335.99L970.1 361.83L975.55 404.9L953.75 456.6L926.5 499.67L882.9 542.75L822.95 551.36L757.55 499.67L719.4 447.98L675.8 396.29L664.9 318.75Z'], // Kyle Filipowski
 1628398:[665.66,0,329.18,385.17,'M680.29 114.73L724.18 40.98L782.71 8.2L899.75 0L965.58 32.78L994.84 81.95L994.84 172.09L965.58 245.85L943.63 295.02L914.38 336L892.43 360.58L855.86 385.17L804.65 385.17L775.39 368.77L746.13 352.38L731.5 327.8L709.55 295.02L694.92 262.24L680.29 213.07L665.66 188.49Z'], // Kyle Kuzma
 1627763:[230,14.34,162.5,193.59,'M247.5 82.45L257.5 53.77L267.5 35.85L282.5 25.09L287.5 14.34L305 17.93L317.5 14.34L332.5 21.51L347.5 17.93L365 28.68L377.5 43.02L387.5 53.77L392.5 75.28L390 93.21L377.5 114.72L362.5 132.65L352.5 143.4L342.5 161.32L330 168.5L320 182.84L307.5 193.59L292.5 204.34L280 207.93L265 204.34L252.5 193.59L242.5 179.25L240 161.32L237.5 150.57L237.5 139.81L230 136.23L230 125.47L240 111.14L247.5 103.97Z'], // Malcolm Brogdon
 1631109:[432.63,188.1,282.15,300.96,'M445.17 338.58L438.9 307.23L457.71 263.34L482.79 231.99L520.41 206.91L576.84 188.1L620.73 188.1L670.89 206.91L695.97 250.8L714.78 294.69L714.78 351.12L689.7 388.74L683.43 420.09L658.35 451.44L633.27 451.44L620.73 432.63L608.19 426.36L583.11 432.63L564.3 445.17L545.49 463.98L520.41 470.25L507.87 489.06L476.52 489.06L451.44 476.52L445.17 457.71L457.71 426.36L438.9 413.82L432.63 395.01L438.9 376.2Z'], // Mark Williams
 1630541:[391.88,0,292.6,451.44,'M418 133.76L438.9 75.24L496.38 25.08L574.75 0L647.9 25.08L679.25 83.6L684.48 175.56L674.02 275.88L653.12 351.12L606.1 401.28L564.3 443.08L512.05 451.44L459.8 418L433.68 376.2L412.77 317.68L391.88 267.52L402.32 183.92Z'], // Moses Moody
 1629023:[422.64,8.21,375.68,418.71,'M434.38 131.36L487.21 49.26L551.78 16.42L675.05 8.21L733.75 49.26L774.84 106.73L798.32 197.04L780.71 270.93L757.23 311.98L710.27 361.24L657.44 402.29L587 426.92L522.43 385.87L475.47 353.03L446.12 303.77L422.64 229.88Z'], // P.J. Washington
 1631094:[726.25,112.5,306.25,337.5,'M813.75 236.25L813.75 191.25L831.25 146.25L857.5 123.75L918.75 112.5L962.5 123.75L997.5 146.25L1015 191.25L1023.75 247.5L1032.5 281.25L1015 315L997.5 348.75L997.5 382.5L971.25 416.25L945 427.5L910 405L875 382.5L857.5 348.75L848.75 382.5L857.5 427.5L840 450L831.25 405L831.25 360L822.5 303.75L805 303.75L778.75 337.5L743.75 348.75L726.25 348.75L726.25 326.25L770 315L805 281.25Z'], // Paolo Banchero
 202331:[407.55,25.08,407.55,545.49,'M407.55 244.53L413.82 169.29L445.17 106.59L501.6 56.43L545.49 31.35L614.46 25.08L683.43 37.62L746.13 62.7L796.29 125.4L815.1 188.1L808.83 275.88L790.02 332.31L783.75 401.28L752.4 451.44L708.51 514.14L652.08 558.03L589.38 570.57L532.95 539.22L495.33 501.6L476.52 438.9L457.71 376.2L438.9 338.58L413.82 300.96Z'], // Paul George
 1631157:[241.36,8.61,349.11,439.11,'M241.36 120.54L267.22 68.88L323.25 25.83L396.52 8.61L474.1 8.61L538.75 43.05L573.23 103.32L590.47 189.42L573.23 249.69L538.75 275.52L521.51 344.4L499.96 396.06L465.48 439.11L422.38 447.72L383.59 421.89L344.8 387.45L318.94 344.4L301.7 275.52L267.22 241.08L245.67 198.03Z'], // Ryan Rollins
 1630180:[637.12,92.31,209.96,293.22,'M651.6 146.61L658.84 124.89L687.8 103.17L724 92.31L774.68 92.31L803.64 114.03L832.6 141.18L839.84 168.33L832.6 200.91L847.08 222.63L839.84 249.78L818.12 266.07L818.12 298.65L803.64 331.23L774.68 352.95L745.72 374.67L709.52 385.53L680.56 385.53L651.6 369.24L637.12 347.52L637.12 320.37L644.36 293.22L644.36 260.64L637.12 238.92L644.36 206.34L637.12 184.62Z'], // Saddiq Bey
 1630530:[228.52,0,299.44,361.83,'M228.52 103.38L252.16 51.69L291.56 17.23L346.72 0L405.82 8.62L453.1 17.23L492.5 43.08L520.08 86.15L527.96 137.84L516.14 189.53L496.44 223.99L472.8 249.84L449.16 267.06L433.4 292.91L405.82 310.14L378.24 344.6L354.6 361.83L327.02 353.21L303.38 335.99L287.62 318.75L279.74 292.91L271.86 267.06L263.98 241.22L252.16 223.99L244.28 198.15L232.46 180.91L232.46 146.46Z'], // Trey Murphy III
 1626145:[462.74,16.07,558.22,744.34,'M477.43 251.69L477.43 160.65L506.81 101.75L550.88 53.55L616.98 32.13L705.12 16.07L822.64 21.42L918.12 48.2L984.23 107.1L1020.96 176.72L1020.96 273.11L998.92 332.01L976.88 406.98L962.2 487.31L932.82 583.7L888.75 669.38L822.64 733.63L741.85 760.41L646.36 728.28L587.6 669.38L558.22 599.76L528.84 503.37L514.15 423.05L484.77 369.5L462.74 305.24Z'], // Tyus Jones
 1628976:[467.07,15.59,401.14,491.09,'M483.56 179.28L472.57 148.1L494.55 116.92L483.56 101.33L505.54 77.95L533.01 70.16L549.5 54.56L582.47 46.77L615.44 23.39L670.39 15.59L730.84 23.39L769.3 38.98L807.76 62.36L846.23 85.75L868.21 109.13L862.72 140.31L846.23 187.08L835.24 233.85L818.75 272.82L802.27 304L791.28 350.77L769.3 389.75L736.33 452.11L703.36 475.5L664.89 498.88L626.43 506.68L593.46 483.29L555 452.11L522.02 413.13L500.05 366.37L494.55 327.39L472.57 311.8L467.07 272.82L467.07 233.85Z'], // Wendell Carter Jr.
 203897:[335.42,8.62,346.78,447.98,'M335.42 120.61L380.89 51.69L437.75 17.23L557.13 8.62L619.66 43.08L670.83 103.38L682.2 198.15L665.14 301.52L625.35 379.06L568.5 422.13L511.65 456.6L449.12 430.75L397.95 387.68L363.84 318.75L346.79 249.84L335.42 180.91Z'], // Zach LaVine
 1630183:[277,0,292,350,'M290 107Q289 89 312 67Q322 35 349 24Q390 9 433 7Q473 1 501 32Q540 56 549 104Q562 118 559 148L557 200Q558 235 540 262Q535 294 534 315Q529 337 495 336L474 335Q450 323 412 303Q386 288 369 261L338 242Q316 266 311 297Q306 320 321 333L333 344Q322 351 313 343Q285 329 287 305Q293 271 308 248L312 226Q307 216 306 196L296 169Q294 146 290 107Z'] // Jaden McDaniels (existing contour)
};
function framedSpotlightPortrait(r,team,slot='spotlight'){
 const id=spotlightArtId(r), frame=portraitFraming[id], face=ordinaryFaceFrames[id];
 const fallback=logo(team)||`<b>${esc(team||'—')}</b>`;
 if(!frame||!window.PlayerPhotos?.portrait(id))return fallback;
 const [path,alt,w,h,extent]=frame;
 const bounds=face?face.slice(0,4):extent;
 const clipId=face?`cs-face-${slot}-${id}`:'';
 const clip=clipId?`<defs><clipPath id="${clipId}" clipPathUnits="userSpaceOnUse"><path d="${face[4]}"></path></clipPath></defs>`:'';
 const ref=window.CourtPreviewAsset?.(path)??path;
 const label=face?`Portrait de ${r.name}, visage seul`:alt;
 return `<svg class="${slot==='profile'?'profile-photo ':''}cs-framed-portrait" viewBox="${bounds.join(' ')}" preserveAspectRatio="xMidYMax meet" role="img" aria-label="${esc(label)}">${clip}<image href="${esc(ref)}" width="${w}" height="${h}" ${clipId?'clip-path="url(#'+clipId+')"':''} onerror="this.closest('svg').setAttribute('hidden','');this.closest('svg').nextElementSibling.hidden=false"></image></svg><span class="cs-art-fallback" hidden>${fallback}</span>`;
}
function editorialSlide(r,index,period,line){
 const team=matchTeam(r)||r.teams.at(-1)||'—';
 const portrait=framedSpotlightPortrait(r,team);
 const s=r.latestMatch?.stats, stats=s?`${s.pts} PTS · ${s.reb} REB · ${s.ast} AST`:'';
 return `<article class="dashboard-spotlight cs-feature"><div class="cs-feature-copy"><p class="court-kicker">À la une · Nº ${index+1} · ${esc(team)}</p><h2 class="${r.name.length>20?'cs-long-name':''}"><button type="button" title="${esc(r.name)}" class="text-button dashboard-spotlight-name" data-player="${esc(r.id)}">${esc(r.name)}</button></h2><div class="cs-feature-number">${fmt(r.fptsPerGame)}</div><p class="cs-feature-units">${period==='available'&&r.gp===1?'FPTS':'FPTS / match · '+r.gp+' MJ'}</p>${stats?`<p class="cs-feature-stat">${period==='available'?'':'Dernier match : '}${stats}</p>`:''}</div><div class="cs-feature-art"><div class="cs-portrait-slot">${portrait}</div></div></article><div class="dashboard-quick-actions"><button type="button" class="text-button" id="dashboardCompare">Comparer ce joueur</button><details class="cs-statline"><summary>Statline complète</summary>${line}</details></div>`;
}
function matchUI(){
 setProfileTheme(null);activePage='match';routeGeneration++;
 document.querySelectorAll('.top nav button').forEach(b=>b.classList.remove('active'));
 const g=games.get(matchId);
 if(!g||!seasonGames.includes(g)){box().innerHTML='<section class="panel"><h2>Match indisponible</h2><button type="button" class="btn" onclick="go(\'home\')">Accueil</button></section>';return;}
 const byKey=new Map(currentData.players.map(p=>[C.playerKeyFor(p),p]));
 const all=currentData.lines.filter(l=>l.gameId===g.id);
 const rows=t=>all.filter(l=>l.teamId===t.id).map(l=>({l,p:byKey.get(C.playerKeyFor(l)),f:C.fantasyPoints(l.stats,META.scoring)})).filter(x=>x.p).sort((a,b)=>(b.f??-Infinity)-(a.f??-Infinity));
 const team=(t,idx)=>`<section class="panel court-team-box" data-team-side="${nameFor(g,t)}"><h3>${logo(t.code)} ${esc(t.code)}</h3>${rows(t).map(({l,p,f})=>`<article class="court-box-row"><div><button type="button" class="text-button" data-court-player="${esc(C.playerIdFor(p))}">${esc(p.name)}</button><b>${fmt(f)} <small>FPTS</small></b></div><details><summary>${l.participation==='played'?`${l.stats.pts} PTS · ${l.stats.reb} REB · ${l.stats.ast} AST`:l.participation==='dnp'?'DNP':'Données manquantes'}</summary><dl class="dashboard-statline">${[['MIN ≈',l.seconds===null?null:l.seconds/60],['PTS',l.stats?.pts],['REB',l.stats?.reb],['AST',l.stats?.ast],['STL',l.stats?.stl],['BLK',l.stats?.blk],['TO',l.stats?.tov],['FG',l.stats?`${l.stats.fgm}/${l.stats.fga}`:null],['3PT',l.stats?`${l.stats.fg3m}/${l.stats.fg3a}`:null],['LF',l.stats?`${l.stats.ftm}/${l.stats.fta}`:null]].map(([key,val])=>`<div><dt>${key}</dt><dd>${val==null?'—':esc(val)}</dd></div>`).join('')}</dl></details></article>`).join('')||'<p class="muted">Aucune statline disponible pour cette équipe.</p>'}</section>`;
 box().innerHTML=`<div class="court-match"><header class="court-match-head"><span class="eyebrow">SCORE FINAL · ${dateLabel(night(g))}</span><h1>${logo(g.away.code)} ${esc(g.away.code)} <strong>${g.finalScores?.[1]??'—'} : ${g.finalScores?.[0]??'—'}</strong> ${esc(g.home.code)} ${logo(g.home.code)}</h1><div class="court-match-switch" role="group" aria-label="Équipe affichée">${[g.away,g.home].map(t=>`<button type="button" data-side="${nameFor(g,t)}">${esc(t.code)}</button>`).join('')}</div></header><div class="court-box-grid">${team(g.away,1)}${team(g.home,0)}</div></div>`;
 const switchTeam=()=>{box().querySelectorAll('[data-side]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.side===matchSide)));box().querySelectorAll('[data-team-side]').forEach(s=>s.classList.toggle('court-team-active',s.dataset.teamSide===matchSide));};
 switchTeam();
 box().querySelectorAll('[data-side]').forEach(b=>b.onclick=()=>{matchSide=b.dataset.side;switchTeam();});
 box().querySelectorAll('[data-court-player]').forEach(b=>b.onclick=()=>openPlayer(b.dataset.courtPlayer));
}
const oldGo=go, oldPlayer=openPlayer;
const href=(p,id)=>'#court/'+p+(id!=null?'/'+encodeURIComponent(id):'');
function remember(){
 const seq=history.state?.court?.seq;if(!seq)return;
 snapshots.set(seq,{...window.FantasySession.capture(),page:activePage,game:matchId,side:matchSide,scoreNight,scoreX:box().querySelector('.court-score-track')?.scrollLeft||0});
 if(snapshots.size>60)snapshots.delete(snapshots.keys().next().value);
}
function route(p,id){
 if(restoring||!ready)return;
 remember();const current=history.state?.court;
 if(current?.p===p&&current?.id===id)return;
 const data={court:{p,id,seq:++nextRoute,back:true}};
 try{history.pushState(data,'',href(p,id));}catch{}
}
function applyView(){document.body.dataset.courtPage=activePage;document.querySelectorAll('.top nav button').forEach(b=>{if(b.id==='tab-'+activePage)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');});}
go=function(p){route(p,null);oldGo(p);applyView();if(!restoring&&ready)window.scrollTo(0,0);};
openPlayer=async function(id,{fromSpotlight=false}={}){
 const key=canonicalPlayerId(id);if(key===null)return;
 // A full-page compositor snapshot must never gate navigation on touch.
 // Keep the individual edition intros: those animate after the page is open.
 const desktopMotion=window.matchMedia('(min-width: 761px) and (hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)').matches;
 const moving=!restoring&&activePage==='home'&&String(key)!=='1630166'&&typeof document.startViewTransition==='function'&&desktopMotion;
 const hero=moving?box().querySelector('.cs-feature'):null;
 const matching=hero&&String(hero.querySelector('[data-player]')?.dataset.player)===String(key)&&(fromSpotlight||document.activeElement===hero.querySelector('[data-player]'));
 const from=matching?hero.querySelector('.cs-portrait-slot'):null;
 route('player',key);
 const origin=routeGeneration;
 let rendered;
 const update=()=>rendered??=(async()=>{
   if(origin!==routeGeneration)return;
   const generation=origin+1;
   try{
     await oldPlayer(key);
     if(generation!==routeGeneration)return;
     applyView();
     const back=box().querySelector('.court-back');if(back)back.hidden=!history.state?.court?.back;
   }catch(error){
     if(generation!==routeGeneration)return;
     box().innerHTML='<section class="panel"><h2>Impossible d’ouvrir cette fiche</h2><button type="button" class="btn">Réessayer</button> <a href="./reparer.html">Réparer l’affichage</a></section>';
     box().querySelector('button').onclick=()=>openPlayer(key);
     box().prepend(backButton());
     applyView();
     console.error(error);
   }
 })();
 if(!from)return update();
 from.style.viewTransitionName='court-portrait';
 let target,transition;
 const cleanup=()=>{from.style.viewTransitionName='';if(target)target.style.viewTransitionName='';};
 try{
   transition=document.startViewTransition(async()=>{
     await update();
     if(activePage!=='player'||String(CURRENT?.player_id)!==String(key))return;
     target=box().querySelector('.player-head .profile-portrait');
     if(target)target.style.viewTransitionName='court-portrait';
   });
   transition.ready.catch(()=>{});
   transition.finished.then(cleanup,cleanup);
   // Even a compositor that never invokes its callback cannot stall the route.
   let timer;
   const fallback=new Promise(resolve=>{timer=setTimeout(()=>{
     try{transition.skipTransition();}catch{}
     cleanup();resolve(update());
   },250);});
   return await Promise.race([transition.updateCallbackDone,fallback]).catch(update).finally(()=>clearTimeout(timer));
 }catch{cleanup();return update();}
};
function openMatch(id){
 if(!games.has(id))return;
 route('match',id);matchId=id;matchSide='away';matchUI();applyView();box().prepend(backButton());window.scrollTo(0,0);
}
const backButton=()=>{const b=document.createElement('button');b.type='button';b.className='court-back';b.textContent='Retour';b.hidden=!history.state?.court?.back;b.onclick=()=>history.back();return b;};
const readRoute=()=>{
 const a=location.hash.match(/^#court\/(home|board|trades|compare|data|player|match)(?:\/([^/]+))?$/);
 if(!a)return null;
 try{return {p:a[1],id:a[2]?decodeURIComponent(a[2]):null};}catch{return null;}
};
async function restoreRoute(r,useSaved=true){
 restoring=true;
 try{
 const s=useSaved?snapshots.get(r?.seq):null;
 if(s?.scoreNight)scoreNight=s.scoreNight;
 if(r?.p==='match'){
   openMatch(Number(r.id));
   if(s?.side){matchSide=s.side;matchUI();box().prepend(backButton());}
 }else if(s){
   const live=window.FantasySession.capture();
   await window.FantasySession.restore({...s,trade:live.trade,compare:live.compare});
 }else if(r?.p==='player'&&r.id!==null)await openPlayer(r.id);
 else go(r?.p||'home');
 applyView();
 if(s)requestAnimationFrame(()=>{const track=box().querySelector('.court-score-track');if(track)track.scrollLeft=s.scoreX;window.scrollTo(0,s.scroll||0);});
 }catch{go('home');}finally{restoring=false;}
}
window.addEventListener('popstate',e=>{
 if(!e.state?.court&&!readRoute())return;
 const r=e.state?.court||readRoute();
 if(activePage===r?.p&&r?.p==='player'&&String(CURRENT?.player_id)===String(r.id))return;
 restoreRoute(r);
});
function normalized(name){return String(name).toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu,'').replace(/[^a-z0-9 ]/g,'');}
function distance(a,b){
 let p=Array.from({length:b.length+1},(_,i)=>i);
 for(let i=0;i<a.length;i++){const r=[i+1];for(let j=0;j<b.length;j++)r.push(Math.min(r[j]+1,p[j+1]+1,p[j]+Number(a[i]!==b[j])));p=r;}return p.at(-1);
}
function fallbackSearch(q){
 const query=normalized(q).trim();if(query.length<4||query.length>45)return [];
 const pool=new Map(window.__DATASET.players.map(([id,name,position,team])=>[String(id),{player_id:id,full_name:name,position,last_team:team}]));
 for(const p of currentData.players){const id=C.playerIdFor(p);if(!pool.has(String(id))&&(!p.nbaId?![...pool.values()].some(h=>normalized(h.full_name)===normalized(p.name)):true))pool.set(String(id),{player_id:id,full_name:p.name});}
 return [...pool.values()].map(p=>{const name=normalized(p.full_name), scores=[name,...name.split(/\s+/)].map(x=>distance(query,x));return {p,n:Math.min(...scores)};})
 .filter(r=>r.n<=(query.length>7?2:1)).sort((a,b)=>a.n-b.n||a.p.full_name.localeCompare(b.p.full_name,'fr')).slice(0,8).map(r=>r.p);
}
function tradeUI(){
 const grid=box().querySelector('.trade-grid');if(!grid)return;
 const dock=document.createElement('div');dock.id='courtTradeDock';dock.className='court-trade-dock';grid.after(dock);
 const hint=document.createElement('span');hint.id='courtTradeDockText';hint.setAttribute('role','status');dock.append(hint);
 const btn=document.createElement('button');btn.type='button';btn.textContent='Détail';btn.onclick=()=>el('tradeSummary')?.scrollIntoView({block:'start'});dock.append(btn);
}
function tradeVerdict(profiles){
 const dock=el('courtTradeDockText');if(!dock)return;
 const diff=el('tradeSummary')?.querySelector('.trade-difference strong,.trade-difference b');
 dock.textContent=diff?`B − A : ${diff.textContent} FPTS`:'Écart indisponible';
 const old=el('courtTradeForm');if(old)old.remove();
 if(tradeState.left.length!==1||tradeState.right.length!==1||window.__DATASET.seasons.includes(tradeState.period))return;
 const period=periodConfig(tradeState.period), matrix=profiles.map(p=>{
   const range=C.aggregate(currentData,p.player_id,period).period;
   return window.FantasyDashboard.playerGameSeries(currentData,p.player_id,{weights:META.scoring}).filter(r=>(!range.start||r.date.slice(0,10)>=range.start)&&r.date.slice(0,10)<=range.end).slice(-20);
 });
 const dates=[...new Set(matrix.flat().map(r=>r.date.slice(0,10)))].sort();if(!dates.length)return;
 const form=document.createElement('section');form.id='courtTradeForm';form.className='panel court-chart';
 const peak=Math.max(1,...matrix.flat().map(p=>p.fpts)), low=Math.min(0,...matrix.flat().map(p=>p.fpts)), x=i=>20+i*460/Math.max(1,dates.length-1), y=v=>105-(v-low)*90/(peak-low);
 form.innerHTML=`<h3>Forme match par match</h3><p class="small muted">Jusqu’à 20 matchs disponibles par joueur sur la période.</p><svg viewBox="0 0 500 115" role="img" aria-label="Courbes des points fantasy des deux joueurs"><line x1="20" x2="480" y1="105" y2="105" stroke="var(--line)"/>${matrix.map((list,i)=>`<polyline fill="none" stroke="${i?'#a62031':'#17408b'}" ${i?'stroke-dasharray="7 4"':''} stroke-width="3" points="${list.map(r=>x(dates.indexOf(r.date.slice(0,10)))+','+y(r.fpts)).join(' ')}"/>${list.map(r=>`<circle r="3" fill="${i?'#a62031':'#17408b'}" cx="${x(dates.indexOf(r.date.slice(0,10)))}" cy="${y(r.fpts)}"/>`).join('')}`).join('')}</svg><label for="courtTradeDate">Choisir une date <select id="courtTradeDate">${dates.slice().reverse().map(d=>`<option>${d}</option>`).join('')}</select></label><p id="courtTradeReadout" aria-live="polite"></p>`;
 el('tradeSummary').after(form);
 const select=el('courtTradeDate'), read=()=>{el('courtTradeReadout').textContent=profiles.map((p,i)=>{const r=matrix[i].find(row=>row.date.slice(0,10)===select.value);return p.full_name+': '+(r?fmt(r.fpts)+' FPTS · '+fmt(r.minutes)+' min':'aucun match enregistré');}).join(' / ');};
 select.onchange=read;read();
}
function board(){
 const toolbar=box().querySelector('.filters');if(!toolbar)return;
 const advanced=document.createElement('details');advanced.className='court-board-extras';const summary=document.createElement('summary');summary.textContent='Filtres équipe, poste et matchs';advanced.append(summary);
 const wrapper=document.createElement('div');wrapper.className='court-filter-fields';
 for(const key of ['fTeam','fPos','fGp'])wrapper.append(el(key).closest('label'));
 advanced.append(wrapper);toolbar.append(advanced);
}
// Display links only. Never feed them into the calculation or import identity.
const artLinks={'highlightly:276':[1642270,'Donovan Clingan'],'highlightly:97':[201142,'Kevin Durant'],'highlightly:220':[2544,'LeBron James'],'highlightly:277':[203081,'Damian Lillard']};
function artId(p){
 const link=artLinks[p.player_id];
 return link&&normalized(p.full_name)===normalized(link[1])?link[0]:p.player_id;
}
const artFor=id=>CURRENT&&id===CURRENT.player_id?profileArt(CURRENT):id;
const profileArt=p=>spotlightArtId({id:p.player_id,name:p.full_name});
// Rotate once per document, independently of the nickname rotation. Restoration
// within this tab keeps the same colors; a reload advances to the next palette.
const bronTeams=['philadelphie','cleveland','lakers','miami'];
const bronTeamNames={philadelphie:'Philadelphie',cleveland:'Cleveland',lakers:'Los Angeles',miami:'Miami'};
function nextBronTeam(storage){
 let i=-1;
 try{const previous=storage?.getItem('nbafs-goat-palette-v1');if(previous!==null&&previous!==undefined&&/^\d$/.test(previous))i=Number(previous);}catch{}
 const next=i>=0&&i<bronTeams.length?(i+1)%bronTeams.length:0;
 try{storage?.setItem('nbafs-goat-palette-v1',String(next));}catch{}
 return bronTeams[next];
}
let bronTeam;
function paletteForLeBron(){
 let storage;
 try{storage=window.localStorage;}catch{}
 return bronTeam??=nextBronTeam(storage);
}
const originalTheme=setProfileTheme, originalGoat=decorateGoatProfile, originalEdition=decorateEditionProfile, originalExperience=decorateProfileExperience, originalOrdinary=decorateOrdinaryProfile;
setProfileTheme=id=>{
 const themedId=artFor(id);
 originalTheme(themedId);
 if(String(themedId)==='2544')document.body.dataset.lebronCity=paletteForLeBron();
 else delete document.body.dataset.lebronCity;
 const sheet=el('court-theme-sheet')?.sheet;
 if(sheet)sheet.disabled=String(id)==='1630166';
};
decorateGoatProfile=(head,id)=>originalGoat(head,artFor(id));
decorateEditionProfile=(head,id)=>originalEdition(head,artFor(id));
decorateProfileExperience=(head,id)=>originalExperience(head,artFor(id));
decorateOrdinaryProfile=(head,player)=>{
  if(profileThemeFor(profileArt(player)).edition)return;
  originalOrdinary(head,player);
  const badge=head.querySelector('.ordinary-club-badge');
  const team=badge?.alt.split(' ')[0];
  theme(head,team);
  const portrait=head.querySelector('.profile-portrait');
  if(portrait&&!portrait.querySelector('.profile-photo'))portrait.insertAdjacentHTML('afterbegin',logo(team));
  if(portrait&&Object.hasOwn(ordinaryFaceFrames,profileArt(player))){
    const original=portrait.querySelector('.profile-photo');
    if(original){
      portrait.classList.add('court-profile-head-art');
      original.outerHTML=framedSpotlightPortrait({id:profileArt(player),name:player.full_name},team,'profile');
    }
  }
  if(Number(artId(player))===1642270)head.classList.add('cs-profile-head');
  head.querySelector('.profile-identity')?.insertAdjacentHTML('afterbegin','<p class="court-kicker">Fiche joueur</p>');
};
// Each existing special player has a different line drawing. These are decorative
// SVG motifs, never player photographs, data, or a change to the roster.
const courtSignatures={
 2544:['LeBron','Couronne','crown','M103 196 145 216 192 151 245 206 297 151 345 215 390 196 367 297H130ZM135 324H362M113 365H384'],
 201142:['Slim Reaper','Trajectoire','sharps','M295 48 109 428M327 78 159 422M359 112 212 422M392 148 260 417'],
 201935:['The Beard','Step-back','arc','M60 397Q138 296 219 341T368 278M73 420H420M292 272Q351 92 424 114M420 114l-18 27m18-27 10 31'],
 203507:['Greek Freak','Colonnade','columns','M100 202 245 101 390 202ZM116 218H375M144 236V397M211 236V397M279 236V397M346 236V397M96 414H394'],
 201566:['The Brodie','Accélération','rush','M290 56 140 261h89l-41 154 163-218h-98zM73 213h83m-95 35h61m213 49h83m-113 39h120'],
 201565:['D-Rose','Pétales','rose','M243 244C172 233 138 178 163 137c27 9 50 21 73 46-14-64-6-102 17-132 37 29 47 80 31 130 26-32 53-43 88-47 23 53-33 100-90 114m-75 4c-70-18-110-63-99-101m246 99c71-22 108-64 100-101M249 249c22 50 25 96 5 174m9-83c40-46 64-51 94-56-10 44-48 65-94 56'],
 203110:['Dray','Verrou','court','M74 365h343V135H74zM170 135v121h151V135M170 256a75 75 0 0 0 151 0M245 180v36m-27-18h54m-133 167a106 106 0 0 1 212 0'],
 203081:['Dame Time','Le cadran','clock','M245 68a171 171 0 1 0 0 342 171 171 0 0 0 0-342ZM245 98v26m0 229v26M103 239h26m232 0h26M245 239V146m0 93 82 43M221 48h48'],
 1626164:['Book','Soleil couchant','sun','M94 345h302M118 320a127 127 0 0 1 254 0M122 374h247M147 403h196M245 74v51m-121 1 30 40m212-40-30 40M77 219l44 15m292-15-44 15'],
 1628369:['JT','Parquet','parquet','M95 123h300v246H95zM95 246h300m-150-123v246M95 184l61-61m-61 124 123-124m-123 185 184-185m-184 246 245-246m-184 246 239-239m-175 239 175-175m-113 175 113-113'],
 201939:['Chef Curry','Flamme et trois points','flame','M135 299h220m-181 0c-37-57-23-112 20-149-4 35 14 55 29 59-19-61 14-104 41-133 0 62 44 74 62 123 18 46-5 71-23 100M178 357h136M225 390h41'],
 203999:['Joker','La passe','comet','M64 393C143 264 297 162 401 113m-67-20 67 20-25 70M84 330c43-45 80-62 119-74m-75 126c40-31 82-47 114-49m128-93 8 24 24 8-24 8-8 24-8-24-24-8 24-8z'],
 203954:['The Process','Arène','arena','M73 355a172 172 0 0 1 344 0M99 373h292M117 355a128 128 0 0 1 256 0m-168-131h80v67h-80zM190 299h110M218 315h54m-38 0 11 34 11-34'],
 1628983:['SGA','Changement de rythme','lanes','M79 348c61 0 49-95 108-95h113c50 0 39-95 111-95M75 389c68 0 66-89 114-89h113c65 0 56-91 109-91M246 112l12 35 36 12-36 12-12 35-12-35-36-12 36-12z']
};
function stageSignature(head,id,edition){
 const plan=courtSignatures[id];if(!plan)return;
 const [name,chapter,motif,d]=plan;
 head.dataset.courtSignature=motif;
 head.classList.add('court-v36','court-stage-'+edition);
 const architecture=document.createElement('div');architecture.className='court-stage-lines';architecture.setAttribute('aria-hidden','true');
 architecture.innerHTML=`<svg viewBox="0 0 490 480" focusable="false"><path pathLength="100" d="${d}"></path></svg><i></i>`;
 head.prepend(architecture);
 // Rose has no registered photo. Retain the fallback and make the rose the artwork.
 if(id===201565&&!head.querySelector('.profile-photo'))head.classList.add('court-stage-no-photo');
 const classNames={goat:'Édition GOAT',mvp:'Galerie MVP',legend:'Légendes de club',dual:'MVP × Légende'};
 const strap=document.createElement('div');strap.className='court-stage-strip';
 const first=document.createElement('span');first.textContent=classNames[edition];
 const second=document.createElement('span');second.textContent=chapter;
 strap.append(first,second);head.prepend(strap);
 const kicker=head.querySelector('.goat-kicker,.edition-kicker');if(kicker)kicker.setAttribute('aria-hidden','true');
 if(document.body.dataset.profileMotion!=='paused'&&!window.matchMedia('(prefers-reduced-motion: reduce)').matches)head.classList.add('court-intro-running');
}

function profile(head){
 box().prepend(backButton());
 const art=profileArt(CURRENT), edition=profileThemeFor(art);
 if(edition.edition){
   const styleClass='court-special-'+edition.edition;
   head.classList.add('court-special',styleClass);
   if(edition.edition==='goat'){
     const marker=document.createElement('span');marker.className='court-sigil';marker.setAttribute('aria-hidden','true');marker.textContent='23';head.prepend(marker);
     const logo=document.createElement('span');logo.className='court-bron-logo';logo.setAttribute('role','img');logo.setAttribute('aria-label','Logo LeBron James');
     const mark=window.CourtPreviewAsset?.('assets/courtside/lebron-james-logo.png');
     if(mark)logo.style.setProperty('--court-bron-mark','url("'+mark+'")');
     head.querySelector('.profile-identity').prepend(logo);
     const serial=head.querySelector('.experience-serial');
     if(serial)serial.textContent='ÉDITION '+bronTeamNames[paletteForLeBron()].toLocaleUpperCase('fr');
   }
   stageSignature(head,art,edition.edition);
 }
 const current=el('currentProfile'), archive=el('profileArchives')||box().querySelector(':scope > .cards:not(.compact-cards)');
 const gameList=current?.querySelector('details:nth-of-type(2)');
 if(!profileThemeFor(art).edition){
  if(archive)archive.id='profileArchives';
  head.after(subnav([['Aperçu',current],['Matchs',gameList],['Saisons',archive]],'court-profile-nav'));
 }
 const action=document.createElement('details');action.className='court-profile-compare';action.innerHTML='<summary>Ajouter à un trade</summary><div><button type="button" class="btn ghost">Côté A</button><button type="button" class="btn ghost">Côté B</button><button type="button" class="text-button">Comparaison simple</button></div><p id="courtProfileNotice" class="small muted" role="status"></p>';
 head.after(action);
 const id=CURRENT.player_id;
 const historyId=art;
 if(historyId!==id&&(window.__DATASET.players.some(p=>p[0]===historyId)||C.findPlayer(currentData,historyId))){
   const link=document.createElement('button');link.type='button';link.className='btn ghost court-history-link';link.textContent='Ouvrir la fiche avec l’historique de saison';link.onclick=()=>openPlayer(historyId);
   action.after(link);
 }
 const [a,b,c]=action.querySelectorAll('button');
 const choose=side=>{const notice=el('courtProfileNotice');if([...tradeState.left,...tradeState.right].includes(id)){notice.textContent='Ce joueur est déjà dans le trade.';return;}if(tradeState[side].length>=5){notice.textContent='Ce côté contient déjà cinq joueurs.';return;}go('trades');addTrade(side,id);};
 a.onclick=()=>choose('left');b.onclick=()=>choose('right');c.onclick=()=>{go('compare');addComparePlayer(id);};
}
// Fixed mobile navigation must not cover suggestions when the virtual keyboard opens.
const vv=window.visualViewport;
if(vv){
 const keyboard=()=>{
   const field=document.activeElement;
   document.body.classList.toggle('court-keyboard',!!field?.matches('input:not([type=range]),textarea')&&window.innerHeight-vv.height>140);
 };
 vv.addEventListener('resize',keyboard);
 document.addEventListener('focusin',keyboard);
 document.addEventListener('focusout',()=>requestAnimationFrame(keyboard));
}
window.Courtside={color:theme,artId:profileArt,home,board,profile,tradeUI,tradeVerdict,fallbackSearch,matchTeam,editorialLayout,editorialSlide,hasDirectRoute:()=>!!readRoute(),async initialRoute(){
 const direct=readRoute(), p=activePage==='player'?'player':activePage;
 const r=direct||{p,id:p==='player'?CURRENT?.player_id:null};
 try{history.scrollRestoration='manual';}catch{}
 try{history.replaceState({court:{...r,seq:++nextRoute,back:false}},'',href(r.p,r.id));}catch{}
 if(direct)await restoreRoute(r,false);
 ready=true;applyView();
}};
})();
