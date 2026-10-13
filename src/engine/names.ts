import type {Region} from './types';

/* ───────────────────────── Name pools by language ─────────────────────────
   Large pools (≈40 first / 50 last): Spanish, English, Russian, Slavic, French, Japanese, Portuguese.
   Medium pools (≈20 / 30): German, Chinese, Thai, Indian, Arabic, Turkish, Nigerian, Southern African.
   Small pools (≈10 / 10): everything else. Male given names only. */
export type NamePool='spanish'|'english'|'russian'|'slavic'|'french'|'japanese'|'portuguese'|'german'|'chinese'|'thai'|'indian'|'arabic'|'turkish'|'nigerian'|'southern'
 |'italian'|'korean'|'greek'|'nordic'|'dutch'|'afrikaans'|'irish'|'georgian'|'persian'|'mongolian'|'indonesian'|'filipino'|'vietnamese'|'kazakh'|'eastafrican'|'westafrican'|'ghanaian'|'central'|'maori';

export const NAME_POOLS:Record<NamePool,{first:readonly string[];last:readonly string[]}>={
 spanish:{
  first:['Alejandro','Andrés','Ángel','Antonio','Carlos','César','Cristian','Daniel','David','Diego','Eduardo','Emiliano','Enrique','Esteban','Fernando','Francisco','Gabriel','Gonzalo','Guillermo','Héctor','Hugo','Ignacio','Iker','Iván','Javier','Jesús','Jorge','José','Juan','Julián','Luis','Manuel','Marcos','Mario','Mateo','Miguel','Nicolás','Pablo','Rafael','Raúl','Ricardo','Rodrigo','Santiago','Sergio','Tomás','Víctor'],
  last:['García','Rodríguez','González','Fernández','López','Martínez','Sánchez','Pérez','Gómez','Martín','Jiménez','Ruiz','Hernández','Díaz','Moreno','Muñoz','Álvarez','Romero','Alonso','Gutiérrez','Navarro','Torres','Domínguez','Vázquez','Ramos','Gil','Ramírez','Serrano','Blanco','Molina','Morales','Suárez','Ortega','Delgado','Castro','Ortiz','Rubio','Marín','Sanz','Núñez','Iglesias','Medina','Garrido','Cortés','Castillo','Santos','Lozano','Guerrero','Cano','Prieto','Méndez','Cruz','Herrera','Peña','Flores','Vargas','Reyes','Aguilar','Mendoza','Rojas']},
 english:{
  first:['James','John','Robert','Michael','William','David','Richard','Joseph','Thomas','Charles','Christopher','Daniel','Matthew','Anthony','Mark','Steven','Andrew','Joshua','Kevin','Brian','George','Ryan','Jacob','Tyler','Jason','Justin','Brandon','Nathan','Dylan','Ethan','Logan','Connor','Jack','Harry','Oliver','Liam','Noah','Mason','Caleb','Marcus','Darius','Jamal','Malik','Andre'],
  last:['Smith','Johnson','Williams','Brown','Jones','Miller','Davis','Wilson','Anderson','Taylor','Thomas','Moore','Jackson','Martin','Thompson','White','Harris','Clark','Lewis','Robinson','Walker','Young','Allen','King','Wright','Scott','Green','Baker','Adams','Nelson','Hill','Campbell','Mitchell','Roberts','Carter','Phillips','Evans','Turner','Parker','Collins','Edwards','Stewart','Morris','Cook','Rogers','Morgan','Cooper','Reed','Bailey','Bell','Hughes','Brooks','Coleman','Hayes','Foster']},
 russian:{
  first:['Aleksandr','Aleksei','Anatoly','Andrei','Anton','Arkady','Artem','Boris','Daniil','Denis','Dmitri','Egor','Evgeny','Fyodor','Gennady','Grigory','Igor','Ilya','Ivan','Kirill','Konstantin','Leonid','Maksim','Matvei','Mikhail','Nikita','Nikolai','Oleg','Pavel','Pyotr','Roman','Ruslan','Semyon','Sergei','Stanislav','Timur','Vadim','Valentin','Viktor','Vladimir','Vyacheslav','Yaroslav','Yuri'],
  last:['Ivanov','Smirnov','Kuznetsov','Popov','Vasiliev','Petrov','Sokolov','Mikhailov','Novikov','Fedorov','Morozov','Volkov','Alekseev','Lebedev','Semenov','Egorov','Pavlov','Kozlov','Stepanov','Nikolaev','Orlov','Andreev','Makarov','Nikitin','Zakharov','Zaitsev','Soloviev','Borisov','Yakovlev','Grigoriev','Romanov','Vorobiev','Sergeev','Kuzmin','Frolov','Aleksandrov','Dmitriev','Korolev','Gusev','Kiselev','Ilyin','Maksimov','Polyakov','Sorokin','Vinogradov','Kovalev','Belov','Medvedev','Antonov','Tarasov','Zhukov','Baranov','Filippov','Komarov']},
 slavic:{
  first:['Jakub','Piotr','Kacper','Michał','Mateusz','Tomasz','Krzysztof','Paweł','Marcin','Łukasz','Wojciech','Bartosz','Marko','Nikola','Stefan','Luka','Milan','Dušan','Nemanja','Aleksandar','Miloš','Bogdan','Dragan','Goran','Zoran','Petar','Filip','Ondřej','Jiří','Tomáš','Lukáš','Vojtěch','Taras','Bohdan','Oleksandr','Andriy','Mykola','Dmytro','Vasyl','Damir','Ante','Josip','Georgi','Hristo'],
  last:['Kowalski','Nowak','Wiśniewski','Wójcik','Kamiński','Lewandowski','Zieliński','Szymański','Woźniak','Dąbrowski','Kozłowski','Jankowski','Mazur','Krawczyk','Piotrowski','Grabowski','Pawlak','Michalski','Jovanović','Petrović','Nikolić','Marković','Đorđević','Stojanović','Ilić','Stanković','Pavlović','Milošević','Popović','Novák','Svoboda','Dvořák','Černý','Procházka','Kučera','Horák','Shevchenko','Kovalenko','Bondarenko','Tkachenko','Kravchenko','Melnyk','Horvat','Kovačić','Babić','Marić','Jurić','Dimitrov','Georgiev','Petkov']},
 french:{
  first:['Lucas','Hugo','Théo','Louis','Nathan','Gabriel','Arthur','Jules','Raphaël','Léo','Maxime','Alexandre','Antoine','Baptiste','Clément','Thomas','Nicolas','Julien','Romain','Guillaume','Quentin','Mathieu','Pierre','Florian','Kévin','Adrien','Damien','Sébastien','Benjamin','Victor','Paul','Mathis','Enzo','Tom','Valentin','Bastien','Cédric','Olivier','Jérôme','Yann'],
  last:['Martin','Bernard','Dubois','Thomas','Robert','Richard','Petit','Durand','Leroy','Moreau','Simon','Laurent','Lefebvre','Michel','David','Bertrand','Roux','Vincent','Fournier','Morel','Girard','André','Lefèvre','Mercier','Dupont','Lambert','Bonnet','François','Legrand','Garnier','Faure','Rousseau','Blanc','Guérin','Muller','Henry','Roussel','Perrin','Morin','Mathieu','Clément','Gauthier','Dumont','Fontaine','Chevalier','Robin','Masson','Marchand','Duval','Lemaire']},
 japanese:{
  first:['Haruto','Ren','Kaito','Riku','Sota','Takumi','Daichi','Yuto','Hiroshi','Takeshi','Kenji','Kazuki','Ryota','Shota','Daiki','Yuki','Kenta','Naoki','Shun','Tatsuya','Ryo','Kosuke','Yusuke','Hayato','Haruki','Sho','Tomoya','Yamato','Itsuki','Kaoru','Makoto','Satoshi','Masato','Kyo','Jin','Taiga','Genki','Rikuto','Akira','Koji'],
  last:['Sato','Suzuki','Takahashi','Tanaka','Watanabe','Ito','Yamamoto','Nakamura','Kobayashi','Kato','Yoshida','Yamada','Sasaki','Yamaguchi','Matsumoto','Inoue','Kimura','Hayashi','Shimizu','Yamazaki','Mori','Abe','Ikeda','Hashimoto','Ishikawa','Ogawa','Okada','Hasegawa','Fujita','Goto','Kondo','Murakami','Endo','Aoki','Sakamoto','Saito','Fukuda','Ota','Nishimura','Fujii','Okamoto','Matsuda','Nakajima','Harada','Ono','Tamura','Takeuchi','Kaneko','Wada','Miyazaki']},
 portuguese:{
  first:['João','Pedro','Lucas','Gabriel','Mateus','Rafael','Thiago','Bruno','Felipe','Gustavo','Rodrigo','Diego','Caio','Vinícius','Leonardo','Marcelo','Eduardo','Fernando','André','Paulo','Ricardo','Fábio','Renato','Anderson','Wanderson','Luiz','Henrique','Arthur','Davi','Miguel','Tiago','Nuno','Rui','Duarte','Gonçalo','Afonso','Vitor','Igor','Matheus','Alexandre'],
  last:['Silva','Santos','Oliveira','Souza','Rodrigues','Ferreira','Alves','Pereira','Lima','Gomes','Costa','Ribeiro','Martins','Carvalho','Almeida','Lopes','Soares','Fernandes','Vieira','Barbosa','Rocha','Dias','Nascimento','Andrade','Moreira','Nunes','Marques','Machado','Mendes','Freitas','Cardoso','Ramos','Gonçalves','Santana','Teixeira','Araújo','Moraes','Pinto','Correia','Cavalcanti','Monteiro','Batista','Campos','Brandão','Sousa','Magalhães','Azevedo','Tavares','Coelho','Reis']},
 german:{
  first:['Lukas','Leon','Felix','Maximilian','Jonas','Paul','Elias','Finn','Niklas','Tim','Jan','Florian','Tobias','Sebastian','Moritz','Dominik','Fabian','Stefan','Markus','Kai','Jannik','Matthias'],
  last:['Müller','Schmidt','Schneider','Fischer','Weber','Meyer','Wagner','Becker','Schulz','Hoffmann','Koch','Richter','Bauer','Klein','Wolf','Schröder','Neumann','Schwarz','Zimmermann','Braun','Krüger','Hofmann','Hartmann','Lange','Schmitt','Werner','Krause','Meier','Lehmann','Huber']},
 chinese:{
  first:['Wei','Jun','Hao','Ming','Lei','Jian','Chen','Tao','Yang','Bo','Peng','Xin','Long','Feng','Kai','Zhen','Yong','Jie','Hui','Qiang','Zihan','Yuxuan'],
  last:['Wang','Li','Zhang','Liu','Chen','Yang','Huang','Zhao','Wu','Zhou','Xu','Sun','Ma','Zhu','Hu','Guo','He','Lin','Gao','Luo','Zheng','Liang','Xie','Song','Tang','Han','Feng','Deng','Cao','Peng']},
 thai:{
  first:['Niran','Anan','Somchai','Krit','Chai','Preecha','Somsak','Boonmee','Kasem','Sittichai','Petch','Rattana','Yodsanan','Nong','Pongsak','Kittisak','Thanawat','Wichai','Apichart','Sombat'],
  last:['Srisuk','Wongchai','Somsri','Thongchai','Chaiyaporn','Sukjai','Boonsong','Kaewkla','Srisawat','Phromma','Charoensuk','Rattanakul','Saetang','Jaidee','Intharat','Wongsawat','Sangthong','Yodkhao','Kittikhun','Pattana','Boonyarat','Suwannarat','Chaiwong','Thammasak','Siriwat','Nakhon','Kongkaew','Phanthong','Dechapol','Mahachai']},
 indian:{
  first:['Arjun','Rohan','Aditya','Vikram','Aarav','Kabir','Rahul','Siddharth','Karan','Aman','Ravi','Sanjay','Harpreet','Gurpreet','Manish','Nikhil','Deepak','Amit','Vivek','Rajesh','Sandeep','Ishaan'],
  last:['Sharma','Singh','Patel','Gupta','Mehta','Kumar','Verma','Reddy','Rao','Nair','Iyer','Joshi','Chopra','Malhotra','Kapoor','Bhatia','Sandhu','Gill','Dhillon','Yadav','Mishra','Pandey','Chauhan','Thakur','Desai','Shah','Pillai','Menon','Banerjee','Mukherjee']},
 arabic:{
  first:['Omar','Karim','Youssef','Ahmed','Mohamed','Mostafa','Hamza','Amine','Bilal','Rachid','Tarek','Khaled','Samir','Nabil','Hassan','Ali','Ibrahim','Mehdi','Ayoub','Anas','Walid','Zakaria'],
  last:['Hassan','Mahmoud','Ibrahim','Saleh','El Amrani','Bennani','Idrissi','Alaoui','Haddad','Khalil','Mansour','Nasser','Farouk','Saad','Hamdi','Aziz','Belkacem','Benali','Boukhari','Chraibi','Darwish','El Fassi','Ghanem','Hakimi','Jaber','Kassem','Mrabet','Rahmani','Zerrouki','Sayed']},
 turkish:{
  first:['Emre','Mert','Kerem','Burak','Ahmet','Kaan','Cem','Murat','Can','Oğuz','Serkan','Volkan','Berk','Arda','Yusuf','Hakan','Ozan','Tolga','Barış','Furkan'],
  last:['Yılmaz','Demir','Çelik','Şahin','Aydın','Kaya','Yıldız','Öztürk','Arslan','Doğan','Kılıç','Aslan','Çetin','Kara','Koç','Kurt','Özdemir','Şimşek','Polat','Ergün','Korkmaz','Aksoy','Bulut','Güneş','Tekin','Ateş','Bozkurt','Uçar','Karaca','Toprak']},
 nigerian:{
  first:['Chinedu','Emeka','Tunde','Ade','Chukwuemeka','Obinna','Ikenna','Femi','Segun','Olumide','Babajide','Kelechi','Uche','Nnamdi','Musa','Abubakar','Ifeanyi','Kayode','Damilola','Oluwaseun','Chidi','Yusuf'],
  last:['Okafor','Adeyemi','Balogun','Okeke','Eze','Nwosu','Okonkwo','Adebayo','Ogunleye','Olawale','Chukwu','Obi','Nwachukwu','Akinola','Bello','Danjuma','Abdullahi','Oladipo','Onyekachi','Ibe','Ojo','Adewale','Uzoma','Afolabi','Agbaje','Ezeh','Odukoya','Okoro','Lawal','Shittu']},
 southern:{
  first:['Siyabonga','Thabo','Sipho','Lunga','Mpho','Themba','Bongani','Sibusiso','Lwazi','Kagiso','Tshepo','Mandla','Andile','Lesego','Thando','Vusi','Xolani','Musa','Kabelo','Neo'],
  last:['Nkosi','Mokoena','Dlamini','Ndlovu','Mthembu','Khumalo','Zulu','Mahlangu','Sithole','Ngcobo','Molefe','Mabaso','Shabalala','Radebe','Masilela','Baloyi','Maseko','Mkhize','Ntuli','Cele','Zwane','Mazibuko','Tshabalala','Hlongwane','Gumede','Majola','Nxumalo','Mabena','Mthethwa','Buthelezi']},
 italian:{first:['Marco','Luca','Alessandro','Giuseppe','Matteo','Lorenzo','Francesco','Davide','Riccardo','Stefano','Andrea','Federico'],last:['Rossi','Russo','Ferrari','Esposito','Bianchi','Romano','Colombo','Ricci','Marino','Greco','Bruno','Gallo','Conti','De Luca','Mancini']},
 korean:{first:['Min-jun','Ji-ho','Seo-jun','Hyun-woo','Jae-hyun','Do-yun','Sung-min','Dong-hyun','Tae-yang','Joon-young','Woo-jin','Jin-woo'],last:['Kim','Lee','Park','Choi','Jung','Kang','Cho','Yoon','Jang','Lim','Han','Oh']},
 greek:{first:['Giorgos','Dimitris','Kostas','Nikos','Yannis','Panagiotis','Christos','Vasilis','Thanasis','Alexandros','Stavros'],last:['Papadopoulos','Pappas','Georgiou','Nikolaidis','Karagiannis','Vlachos','Dimitriou','Konstantinidis','Oikonomou','Makris','Antoniou']},
 nordic:{first:['Erik','Lars','Anders','Magnus','Olav','Johan','Henrik','Nils','Sven','Bjørn','Gustav','Oskar'],last:['Johansson','Andersson','Larsson','Nilsson','Hansen','Olsen','Berg','Lindqvist','Haugen','Eriksen','Solberg','Lund']},
 dutch:{first:['Daan','Sem','Lars','Bram','Thijs','Jesse','Ruben','Stijn','Niels','Joris','Pieter','Hendrik'],last:['de Jong','Jansen','de Vries','van den Berg','van Dijk','Bakker','Visser','Smit','Meijer','de Boer','Mulder','Bos','Vermeulen']},
 afrikaans:{first:['Pieter','Johan','Francois','Hendrik','Willem','Jacques','Ruan','Dewald','Gerhard','Schalk'],last:['van der Merwe','Botha','Pretorius','du Plessis','Nel','Venter','Steyn','Coetzee','Fourie','Kruger','Joubert','du Toit']},
 irish:{first:['Sean','Conor','Cian','Ronan','Darragh','Oisín','Eoin','Ciarán','Padraig','Niall'],last:['Murphy','Kelly','O’Brien','Walsh','O’Sullivan','Byrne','Ryan','O’Connor','Doyle','McCarthy','Gallagher','Kavanagh']},
 georgian:{first:['Giorgi','Levan','Nika','Irakli','Dato','Luka','Lasha','Zurab','Tornike','Otar'],last:['Kapanadze','Beridze','Gelashvili','Maisuradze','Lomidze','Tsiklauri','Kvirikashvili','Javakhishvili','Abashidze','Chikovani','Tsereteli','Gogoladze']},
 persian:{first:['Amir','Reza','Sina','Arash','Navid','Kian','Dariush','Farhad','Babak','Kourosh'],last:['Hosseini','Rahimi','Karimi','Ahmadi','Mohammadi','Rezaei','Moradi','Jafari','Ghasemi','Kazemi','Sadeghi']},
 mongolian:{first:['Bat-Erdene','Temuulen','Bilegt','Munkh-Erdene','Ganbold','Erdenebat','Batbold','Tsogt','Altangerel','Sukhbat'],last:['Batbayar','Erdenebat','Enkhbayar','Gantulga','Dorj','Bold','Ganzorig','Purevdorj','Tumurbaatar','Otgonbayar']},
 indonesian:{first:['Rizky','Bima','Arief','Dimas','Fajar','Agus','Budi','Eko','Hendra','Yoga'],last:['Pratama','Wijaya','Saputra','Hidayat','Nugroho','Santoso','Susanto','Kurniawan','Setiawan','Gunawan']},
 filipino:{first:['Miguel','Jose','Paolo','Gabriel','Carlo','Mark','Rey','Jerome','Arnel','Rommel'],last:['Santos','Reyes','Cruz','Bautista','Dela Cruz','Garcia','Mendoza','Villanueva','Ramos','Aquino','Navarro','Castillo']},
 vietnamese:{first:['Minh','Huy','Duc','Tuan','Khanh','Long','Quang','Bao','Phuc','Thanh'],last:['Nguyen','Tran','Le','Pham','Hoang','Phan','Vu','Dang','Bui','Do']},
 kazakh:{first:['Nurlan','Daniyar','Yerlan','Arman','Askar','Bauyrzhan','Serik','Timur','Azamat','Aidos'],last:['Abenov','Seitkali','Zhakupov','Bekov','Akhmetov','Sultanbekov','Omarov','Ismailov','Kenzhebekov','Baimukhanov']},
 eastafrican:{first:['Juma','Baraka','Jabari','Kiptoo','Kibet','Otieno','Haruna','Salim','Rashidi','Hamisi'],last:['Mwangi','Kamau','Omondi','Wanjala','Kiprotich','Ochieng','Njoroge','Mutua','Kariuki','Odhiambo']},
 westafrican:{first:['Mamadou','Cheikh','Ibrahima','Pape','Moussa','Ousmane','Abdoulaye','Modou','Lamine','Babacar'],last:['Diop','Ndiaye','Fall','Sarr','Ba','Diallo','Sow','Faye','Gueye','Mbaye','Cissé','Touré']},
 ghanaian:{first:['Kwame','Kofi','Kojo','Yaw','Kwabena','Kwaku','Kwesi','Kwadwo','Fiifi','Nana'],last:['Mensah','Boateng','Asante','Owusu','Osei','Appiah','Agyeman','Darko','Ofori','Amoah']},
 central:{first:['Jean','Eric','Samuel','André','Patrick','Serge','Christian','Alain','Hervé','Landry'],last:['Mbarga','Njoya','Kameni','Biyong','Etoundi','Nkoulou','Ngando','Essomba','Fotso','Tchami','Kalala','Mukendi','Tshibangu','Ilunga','Kabongo']},
 maori:{first:['Tane','Wiremu','Rawiri','Nikau','Hemi','Mikaere','Tama','Kauri','Manaia','Ihaia'],last:['Ngata','Parata','Tipene','Tamihana','Horomona','Kereama','Ruatapu','Rangi','Paewai','Herewini']},
};

/** A heritage picks the pool for the given name and the surname. */
interface Heritage {first:NamePool;last:NamePool;weight:number;}
export interface Country {name:string;flag:string;region:Region;weight:number;key:boolean;heritages:readonly Heritage[];}
const h=(first:NamePool,weight:number,last:NamePool=first):Heritage=>({first,last,weight});
const C=(region:Region,name:string,flag:string,weight:number,heritages:Heritage[],key=false):Country=>({name,flag,region,weight,key,heritages});

/* Each region has three key countries: more fighters, and almost all generational and most legendary talents. */
export const COUNTRIES:readonly Country[]=[
 // Americas
 C('Americas','United States','🇺🇸',10,[h('english',55),h('spanish',18),h('english',8,'german'),h('english',6,'irish'),h('english',5,'italian'),h('slavic',3),h('english',5,'nigerian')],true),
 C('Americas','Mexico','🇲🇽',8,[h('spanish',100)],true),
 C('Americas','Brazil','🇧🇷',8,[h('portuguese',90),h('portuguese',5,'italian'),h('portuguese',5,'japanese')],true),
 C('Americas','Canada','🇨🇦',3,[h('english',58),h('french',30),h('english',12,'irish')]),
 C('Americas','Argentina','🇦🇷',2.5,[h('spanish',60),h('spanish',40,'italian')]),
 C('Americas','Cuba','🇨🇺',2,[h('spanish',100)]),
 C('Americas','Colombia','🇨🇴',2,[h('spanish',100)]),
 C('Americas','Peru','🇵🇪',1.5,[h('spanish',100)]),
 C('Americas','Venezuela','🇻🇪',1.5,[h('spanish',100)]),
 C('Americas','Ecuador','🇪🇨',1.2,[h('spanish',100)]),
 C('Americas','Chile','🇨🇱',1.2,[h('spanish',100)]),
 C('Americas','Dominican Republic','🇩🇴',1,[h('spanish',100)]),
 C('Americas','Puerto Rico','🇵🇷',1,[h('spanish',100)]),
 C('Americas','Costa Rica','🇨🇷',.8,[h('spanish',100)]),
 C('Americas','Jamaica','🇯🇲',1,[h('english',100)]),
 // Europe & Middle East
 C('Europe & Middle East','Russia','🇷🇺',9,[h('russian',100)],true),
 C('Europe & Middle East','England','🏴󠁧󠁢󠁥󠁮󠁧󠁿',8,[h('english',78),h('english',6,'irish'),h('indian',8),h('english',8,'nigerian')],true),
 C('Europe & Middle East','France','🇫🇷',6,[h('french',80),h('arabic',20)],true),
 C('Europe & Middle East','Spain','🇪🇸',2.5,[h('spanish',100)]),
 C('Europe & Middle East','Poland','🇵🇱',2.5,[h('slavic',100)]),
 C('Europe & Middle East','Ukraine','🇺🇦',2,[h('slavic',100)]),
 C('Europe & Middle East','Serbia','🇷🇸',1.5,[h('slavic',100)]),
 C('Europe & Middle East','Croatia','🇭🇷',1,[h('slavic',100)]),
 C('Europe & Middle East','Czechia','🇨🇿',1,[h('slavic',100)]),
 C('Europe & Middle East','Bulgaria','🇧🇬',.8,[h('slavic',100)]),
 C('Europe & Middle East','Germany','🇩🇪',2,[h('german',85),h('turkish',15)]),
 C('Europe & Middle East','Netherlands','🇳🇱',1.5,[h('dutch',80),h('arabic',20)]),
 C('Europe & Middle East','Sweden','🇸🇪',1,[h('nordic',100)]),
 C('Europe & Middle East','Norway','🇳🇴',.8,[h('nordic',100)]),
 C('Europe & Middle East','Italy','🇮🇹',1.2,[h('italian',100)]),
 C('Europe & Middle East','Greece','🇬🇷',.8,[h('greek',100)]),
 C('Europe & Middle East','Ireland','🇮🇪',1.5,[h('irish',70),h('english',30,'irish')]),
 C('Europe & Middle East','Portugal','🇵🇹',1,[h('portuguese',100)]),
 C('Europe & Middle East','Georgia','🇬🇪',1.5,[h('georgian',100)]),
 C('Europe & Middle East','Turkey','🇹🇷',2,[h('turkish',100)]),
 C('Europe & Middle East','Iran','🇮🇷',1.5,[h('persian',100)]),
 C('Europe & Middle East','Lebanon','🇱🇧',.6,[h('arabic',100)]),
 // Africa
 C('Africa','Nigeria','🇳🇬',9,[h('nigerian',70),h('english',30,'nigerian')],true),
 C('Africa','Cameroon','🇨🇲',5,[h('central',100)],true),
 C('Africa','South Africa','🇿🇦',5,[h('southern',55),h('afrikaans',25),h('english',20)],true),
 C('Africa','Morocco','🇲🇦',2,[h('arabic',100)]),
 C('Africa','Egypt','🇪🇬',2,[h('arabic',100)]),
 C('Africa','Algeria','🇩🇿',1.2,[h('arabic',85),h('french',15,'arabic')]),
 C('Africa','Tunisia','🇹🇳',.8,[h('arabic',100)]),
 C('Africa','Senegal','🇸🇳',2,[h('westafrican',100)]),
 C('Africa','Mali','🇲🇱',.8,[h('westafrican',100)]),
 C('Africa','Kenya','🇰🇪',1.5,[h('eastafrican',70),h('english',30,'eastafrican')]),
 C('Africa','Tanzania','🇹🇿',.8,[h('eastafrican',100)]),
 C('Africa','Ghana','🇬🇭',1.5,[h('ghanaian',80),h('english',20,'ghanaian')]),
 C('Africa','DR Congo','🇨🇩',1.5,[h('french',60,'central'),h('central',40)]),
 C('Africa','Angola','🇦🇴',1,[h('portuguese',55),h('portuguese',45,'central')]),
 C('Africa','Mozambique','🇲🇿',.8,[h('portuguese',60),h('portuguese',40,'southern')]),
 // APAC
 C('APAC','Japan','🇯🇵',9,[h('japanese',100)],true),
 C('APAC','China','🇨🇳',7,[h('chinese',100)],true),
 C('APAC','Thailand','🇹🇭',6,[h('thai',100)],true),
 C('APAC','South Korea','🇰🇷',2,[h('korean',100)]),
 C('APAC','India','🇮🇳',2,[h('indian',100)]),
 C('APAC','Philippines','🇵🇭',1.5,[h('filipino',100)]),
 C('APAC','Indonesia','🇮🇩',1.2,[h('indonesian',100)]),
 C('APAC','Mongolia','🇲🇳',1.2,[h('mongolian',100)]),
 C('APAC','Australia','🇦🇺',2.5,[h('english',80),h('english',10,'irish'),h('greek',5),h('italian',5)]),
 C('APAC','New Zealand','🇳🇿',1.2,[h('english',60),h('maori',40)]),
 C('APAC','Kazakhstan','🇰🇿',1.2,[h('kazakh',70),h('russian',30)]),
 C('APAC','Vietnam','🇻🇳',.8,[h('vietnamese',100)]),
];
export const countriesIn=(region:Region)=>COUNTRIES.filter(c=>c.region===region);
export const countryNamed=(name:string)=>COUNTRIES.find(c=>c.name===name);
