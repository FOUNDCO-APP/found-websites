// Static US cities dataset — cities with population ~25k+, all state capitals, plus
// major smaller cities. Used for city autocomplete in onboarding (no API needed).
// Format: [city, stateAbbrev]
export const US_CITIES: [string, string][] = [
  // Alabama
  ["Birmingham","AL"],["Montgomery","AL"],["Huntsville","AL"],["Mobile","AL"],
  ["Tuscaloosa","AL"],["Hoover","AL"],["Dothan","AL"],["Auburn","AL"],
  ["Decatur","AL"],["Madison","AL"],["Florence","AL"],["Phenix City","AL"],
  // Alaska
  ["Anchorage","AK"],["Fairbanks","AK"],["Juneau","AK"],["Sitka","AK"],
  // Arizona
  ["Phoenix","AZ"],["Tucson","AZ"],["Mesa","AZ"],["Chandler","AZ"],
  ["Scottsdale","AZ"],["Glendale","AZ"],["Gilbert","AZ"],["Peoria","AZ"],
  ["Tempe","AZ"],["Surprise","AZ"],["Goodyear","AZ"],["Yuma","AZ"],
  ["Avondale","AZ"],["Flagstaff","AZ"],["Casa Grande","AZ"],["Maricopa","AZ"],
  ["Buckeye","AZ"],["Lake Havasu City","AZ"],["Queen Creek","AZ"],["Sierra Vista","AZ"],
  ["Prescott","AZ"],["Apache Junction","AZ"],["Prescott Valley","AZ"],
  // Arkansas
  ["Little Rock","AR"],["Fort Smith","AR"],["Fayetteville","AR"],["Springdale","AR"],
  ["Jonesboro","AR"],["Rogers","AR"],["Conway","AR"],["North Little Rock","AR"],
  ["Bentonville","AR"],["Pine Bluff","AR"],
  // California
  ["Los Angeles","CA"],["San Diego","CA"],["San Jose","CA"],["San Francisco","CA"],
  ["Fresno","CA"],["Sacramento","CA"],["Long Beach","CA"],["Oakland","CA"],
  ["Bakersfield","CA"],["Anaheim","CA"],["Santa Ana","CA"],["Riverside","CA"],
  ["Stockton","CA"],["Chula Vista","CA"],["Irvine","CA"],["Fremont","CA"],
  ["San Bernardino","CA"],["Modesto","CA"],["Fontana","CA"],["Moreno Valley","CA"],
  ["Glendale","CA"],["Huntington Beach","CA"],["Santa Clarita","CA"],["Garden Grove","CA"],
  ["Oceanside","CA"],["Rancho Cucamonga","CA"],["Santa Rosa","CA"],["Ontario","CA"],
  ["Corona","CA"],["Elk Grove","CA"],["Lancaster","CA"],["Palmdale","CA"],
  ["Salinas","CA"],["Pomona","CA"],["Escondido","CA"],["Torrance","CA"],
  ["Pasadena","CA"],["Hayward","CA"],["Sunnyvale","CA"],["Concord","CA"],
  ["Roseville","CA"],["Visalia","CA"],["Fullerton","CA"],["Victorville","CA"],
  ["Murrieta","CA"],["Thousand Oaks","CA"],["Simi Valley","CA"],["Santa Clara","CA"],
  ["Berkeley","CA"],["Clovis","CA"],["Norwalk","CA"],["El Monte","CA"],
  ["Downey","CA"],["Fairfield","CA"],["Costa Mesa","CA"],["Antioch","CA"],
  ["Carlsbad","CA"],["Inglewood","CA"],["Richmond","CA"],["Ventura","CA"],
  ["West Covina","CA"],["Temecula","CA"],["Daly City","CA"],["Burbank","CA"],
  ["Rialto","CA"],["El Cajon","CA"],["San Mateo","CA"],["Compton","CA"],
  ["Orange","CA"],["Oxnard","CA"],["Vallejo","CA"],["Santa Barbara","CA"],
  ["Chico","CA"],["Napa","CA"],["Redding","CA"],["Hemet","CA"],
  ["Santa Maria","CA"],["Menifee","CA"],["Whittier","CA"],["Vacaville","CA"],
  ["El Paso de Robles","CA"],["San Leandro","CA"],["Tuscaloosa","CA"],
  ["Hawthorne","CA"],["Citrus Heights","CA"],["Alhambra","CA"],["Tracy","CA"],
  ["Livermore","CA"],["Jurupa Valley","CA"],["Indio","CA"],["Hesperia","CA"],
  // Colorado
  ["Denver","CO"],["Colorado Springs","CO"],["Aurora","CO"],["Fort Collins","CO"],
  ["Lakewood","CO"],["Thornton","CO"],["Arvada","CO"],["Westminster","CO"],
  ["Pueblo","CO"],["Centennial","CO"],["Boulder","CO"],["Greeley","CO"],
  ["Longmont","CO"],["Loveland","CO"],["Broomfield","CO"],["Castle Rock","CO"],
  ["Grand Junction","CO"],["Commerce City","CO"],["Parker","CO"],["Northglenn","CO"],
  // Connecticut
  ["Bridgeport","CT"],["New Haven","CT"],["Stamford","CT"],["Hartford","CT"],
  ["Waterbury","CT"],["Norwalk","CT"],["Danbury","CT"],["New Britain","CT"],
  ["Bristol","CT"],["Meriden","CT"],["West Hartford","CT"],["Milford","CT"],
  // Delaware
  ["Wilmington","DE"],["Dover","DE"],["Newark","DE"],["Middletown","DE"],
  // Florida
  ["Jacksonville","FL"],["Miami","FL"],["Tampa","FL"],["Orlando","FL"],
  ["St. Petersburg","FL"],["Hialeah","FL"],["Tallahassee","FL"],["Port St. Lucie","FL"],
  ["Cape Coral","FL"],["Fort Lauderdale","FL"],["Pembroke Pines","FL"],["Hollywood","FL"],
  ["Miramar","FL"],["Gainesville","FL"],["Coral Springs","FL"],["Miami Gardens","FL"],
  ["Clearwater","FL"],["Palm Bay","FL"],["Pompano Beach","FL"],["West Palm Beach","FL"],
  ["Lakeland","FL"],["Davie","FL"],["Miami Beach","FL"],["Boca Raton","FL"],
  ["Deltona","FL"],["Plantation","FL"],["Sunrise","FL"],["Fort Myers","FL"],
  ["Palm Coast","FL"],["Deerfield Beach","FL"],["Largo","FL"],["Melbourne","FL"],
  ["Boynton Beach","FL"],["Kissimmee","FL"],["Pensacola","FL"],["Brandon","FL"],
  ["Spring Hill","FL"],["Homestead","FL"],["Fort Pierce","FL"],["Ocala","FL"],
  ["Daytona Beach","FL"],["North Port","FL"],["Coral Gables","FL"],["Sanford","FL"],
  ["Doral","FL"],["Lehigh Acres","FL"],["Palm Harbor","FL"],["Riverview","FL"],
  // Georgia
  ["Atlanta","GA"],["Columbus","GA"],["Augusta","GA"],["Macon","GA"],
  ["Savannah","GA"],["Athens","GA"],["Sandy Springs","GA"],["South Fulton","GA"],
  ["Roswell","GA"],["Johns Creek","GA"],["Albany","GA"],["Warner Robins","GA"],
  ["Alpharetta","GA"],["Marietta","GA"],["Valdosta","GA"],["Smyrna","GA"],
  ["Dunwoody","GA"],["Brookhaven","GA"],["Gainesville","GA"],["Peachtree City","GA"],
  // Hawaii
  ["Honolulu","HI"],["Pearl City","HI"],["Hilo","HI"],["Kailua","HI"],
  ["Kaneohe","HI"],["Mililani","HI"],["Kapolei","HI"],
  // Idaho
  ["Boise","ID"],["Meridian","ID"],["Nampa","ID"],["Idaho Falls","ID"],
  ["Pocatello","ID"],["Caldwell","ID"],["Coeur d'Alene","ID"],["Twin Falls","ID"],
  ["Lewiston","ID"],["Rexburg","ID"],
  // Illinois
  ["Chicago","IL"],["Aurora","IL"],["Joliet","IL"],["Naperville","IL"],
  ["Rockford","IL"],["Springfield","IL"],["Elgin","IL"],["Peoria","IL"],
  ["Champaign","IL"],["Waukegan","IL"],["Cicero","IL"],["Bloomington","IL"],
  ["Arlington Heights","IL"],["Evanston","IL"],["Decatur","IL"],["Schaumburg","IL"],
  ["Bolingbrook","IL"],["Palatine","IL"],["Skokie","IL"],["Des Plaines","IL"],
  ["Orland Park","IL"],["Tinley Park","IL"],["Oak Lawn","IL"],["Berwyn","IL"],
  // Indiana
  ["Indianapolis","IN"],["Fort Wayne","IN"],["Evansville","IN"],["South Bend","IN"],
  ["Carmel","IN"],["Fishers","IN"],["Bloomington","IN"],["Hammond","IN"],
  ["Gary","IN"],["Muncie","IN"],["Lafayette","IN"],["Terre Haute","IN"],
  ["Kokomo","IN"],["Anderson","IN"],["Noblesville","IN"],["Greenwood","IN"],
  // Iowa
  ["Des Moines","IA"],["Cedar Rapids","IA"],["Davenport","IA"],["Sioux City","IA"],
  ["Iowa City","IA"],["Waterloo","IA"],["Ames","IA"],["Council Bluffs","IA"],
  ["Dubuque","IA"],["West Des Moines","IA"],
  // Kansas
  ["Wichita","KS"],["Overland Park","KS"],["Kansas City","KS"],["Olathe","KS"],
  ["Topeka","KS"],["Lawrence","KS"],["Shawnee","KS"],["Manhattan","KS"],
  ["Lenexa","KS"],["Salina","KS"],
  // Kentucky
  ["Louisville","KY"],["Lexington","KY"],["Bowling Green","KY"],["Owensboro","KY"],
  ["Covington","KY"],["Georgetown","KY"],["Hopkinsville","KY"],["Richmond","KY"],
  ["Frankfort","KY"],["Florence","KY"],
  // Louisiana
  ["New Orleans","LA"],["Baton Rouge","LA"],["Shreveport","LA"],["Metairie","LA"],
  ["Lafayette","LA"],["Lake Charles","LA"],["Kenner","LA"],["Bossier City","LA"],
  ["Monroe","LA"],["Alexandria","LA"],
  // Maine
  ["Portland","ME"],["Lewiston","ME"],["Bangor","ME"],["South Portland","ME"],
  ["Auburn","ME"],["Augusta","ME"],
  // Maryland
  ["Baltimore","MD"],["Frederick","MD"],["Rockville","MD"],["Gaithersburg","MD"],
  ["Bowie","MD"],["Hagerstown","MD"],["Annapolis","MD"],["College Park","MD"],
  ["Waldorf","MD"],["Towson","MD"],
  // Massachusetts
  ["Boston","MA"],["Worcester","MA"],["Springfield","MA"],["Cambridge","MA"],
  ["Lowell","MA"],["Brockton","MA"],["Quincy","MA"],["Lynn","MA"],
  ["New Bedford","MA"],["Fall River","MA"],["Newton","MA"],["Lawrence","MA"],
  ["Somerville","MA"],["Framingham","MA"],["Waltham","MA"],["Haverhill","MA"],
  ["Malden","MA"],["Medford","MA"],["Taunton","MA"],["Chicopee","MA"],
  // Michigan
  ["Detroit","MI"],["Grand Rapids","MI"],["Warren","MI"],["Sterling Heights","MI"],
  ["Ann Arbor","MI"],["Lansing","MI"],["Flint","MI"],["Dearborn","MI"],
  ["Livonia","MI"],["Troy","MI"],["Westland","MI"],["Farmington Hills","MI"],
  ["Kalamazoo","MI"],["Wyoming","MI"],["Southfield","MI"],["Rochester Hills","MI"],
  ["Taylor","MI"],["Pontiac","MI"],["Muskegon","MI"],["Saginaw","MI"],
  ["Battle Creek","MI"],["Midland","MI"],["Holland","MI"],["Traverse City","MI"],
  // Minnesota
  ["Minneapolis","MN"],["Saint Paul","MN"],["Rochester","MN"],["Duluth","MN"],
  ["Bloomington","MN"],["Brooklyn Park","MN"],["Plymouth","MN"],["Saint Cloud","MN"],
  ["Eagan","MN"],["Woodbury","MN"],["Maple Grove","MN"],["Coon Rapids","MN"],
  ["Burnsville","MN"],["Apple Valley","MN"],["Edina","MN"],["Minnetonka","MN"],
  // Mississippi
  ["Jackson","MS"],["Gulfport","MS"],["Southaven","MS"],["Hattiesburg","MS"],
  ["Biloxi","MS"],["Meridian","MS"],["Tupelo","MS"],["Olive Branch","MS"],
  ["Horn Lake","MS"],["Columbus","MS"],
  // Missouri
  ["Kansas City","MO"],["Saint Louis","MO"],["Springfield","MO"],["Columbia","MO"],
  ["Independence","MO"],["Lee's Summit","MO"],["O'Fallon","MO"],["St. Joseph","MO"],
  ["St. Charles","MO"],["Blue Springs","MO"],["Joplin","MO"],["Chesterfield","MO"],
  ["Jefferson City","MO"],["Florissant","MO"],
  // Montana
  ["Billings","MT"],["Missoula","MT"],["Great Falls","MT"],["Bozeman","MT"],
  ["Butte","MT"],["Helena","MT"],["Kalispell","MT"],
  // Nebraska
  ["Omaha","NE"],["Lincoln","NE"],["Bellevue","NE"],["Grand Island","NE"],
  ["Kearney","NE"],["Fremont","NE"],["Hastings","NE"],
  // Nevada
  ["Las Vegas","NV"],["Henderson","NV"],["Reno","NV"],["North Las Vegas","NV"],
  ["Sparks","NV"],["Carson City","NV"],["Sunrise Manor","NV"],["Paradise","NV"],
  // New Hampshire
  ["Manchester","NH"],["Nashua","NH"],["Concord","NH"],["Derry","NH"],
  ["Dover","NH"],["Rochester","NH"],["Salem","NH"],
  // New Jersey
  ["Newark","NJ"],["Jersey City","NJ"],["Paterson","NJ"],["Elizabeth","NJ"],
  ["Edison","NJ"],["Woodbridge","NJ"],["Lakewood","NJ"],["Toms River","NJ"],
  ["Hamilton","NJ"],["Trenton","NJ"],["Clifton","NJ"],["Camden","NJ"],
  ["Passaic","NJ"],["Bayonne","NJ"],["East Orange","NJ"],["Union City","NJ"],
  ["Vineland","NJ"],["New Brunswick","NJ"],["Perth Amboy","NJ"],["Irvington","NJ"],
  ["Cherry Hill","NJ"],["Brick","NJ"],["Hackensack","NJ"],
  // New Mexico
  ["Albuquerque","NM"],["Las Cruces","NM"],["Rio Rancho","NM"],["Santa Fe","NM"],
  ["Roswell","NM"],["Farmington","NM"],["Sunland Park","NM"],["Clovis","NM"],
  ["Hobbs","NM"],["Alamogordo","NM"],
  // New York
  ["New York","NY"],["Buffalo","NY"],["Rochester","NY"],["Yonkers","NY"],
  ["Syracuse","NY"],["Albany","NY"],["New Rochelle","NY"],["Mount Vernon","NY"],
  ["Schenectady","NY"],["Utica","NY"],["White Plains","NY"],["Troy","NY"],
  ["Niagara Falls","NY"],["Binghamton","NY"],["Freeport","NY"],["Valley Stream","NY"],
  // North Carolina
  ["Charlotte","NC"],["Raleigh","NC"],["Greensboro","NC"],["Durham","NC"],
  ["Winston-Salem","NC"],["Fayetteville","NC"],["Cary","NC"],["Wilmington","NC"],
  ["High Point","NC"],["Concord","NC"],["Asheville","NC"],["Jacksonville","NC"],
  ["Gastonia","NC"],["Chapel Hill","NC"],["Rocky Mount","NC"],["Burlington","NC"],
  ["Wilson","NC"],["Greenville","NC"],["Huntersville","NC"],["Kannapolis","NC"],
  // North Dakota
  ["Fargo","ND"],["Bismarck","ND"],["Grand Forks","ND"],["Minot","ND"],
  // Ohio
  ["Columbus","OH"],["Cleveland","OH"],["Cincinnati","OH"],["Toledo","OH"],
  ["Akron","OH"],["Dayton","OH"],["Parma","OH"],["Canton","OH"],
  ["Youngstown","OH"],["Lorain","OH"],["Hamilton","OH"],["Springfield","OH"],
  ["Kettering","OH"],["Elyria","OH"],["Lakewood","OH"],["Cuyahoga Falls","OH"],
  ["Middletown","OH"],["Newark","OH"],["Mentor","OH"],
  // Oklahoma
  ["Oklahoma City","OK"],["Tulsa","OK"],["Norman","OK"],["Broken Arrow","OK"],
  ["Lawton","OK"],["Edmond","OK"],["Moore","OK"],["Midwest City","OK"],
  ["Stillwater","OK"],["Enid","OK"],["Owasso","OK"],
  // Oregon
  ["Portland","OR"],["Eugene","OR"],["Salem","OR"],["Gresham","OR"],
  ["Hillsboro","OR"],["Beaverton","OR"],["Bend","OR"],["Medford","OR"],
  ["Springfield","OR"],["Corvallis","OR"],["Albany","OR"],["Tigard","OR"],
  ["Lake Oswego","OR"],["Keizer","OR"],
  // Pennsylvania
  ["Philadelphia","PA"],["Pittsburgh","PA"],["Allentown","PA"],["Erie","PA"],
  ["Reading","PA"],["Scranton","PA"],["Bethlehem","PA"],["Lancaster","PA"],
  ["Harrisburg","PA"],["York","PA"],["Altoona","PA"],["Wilkes-Barre","PA"],
  ["Chester","PA"],["Easton","PA"],["Norristown","PA"],
  // Rhode Island
  ["Providence","RI"],["Cranston","RI"],["Warwick","RI"],["Pawtucket","RI"],
  ["East Providence","RI"],["Woonsocket","RI"],
  // South Carolina
  ["Columbia","SC"],["Charleston","SC"],["North Charleston","SC"],["Mount Pleasant","SC"],
  ["Rock Hill","SC"],["Greenville","SC"],["Summerville","SC"],["Goose Creek","SC"],
  ["Hilton Head Island","SC"],["Spartanburg","SC"],["Florence","SC"],
  // South Dakota
  ["Sioux Falls","SD"],["Rapid City","SD"],["Aberdeen","SD"],["Pierre","SD"],
  // Tennessee
  ["Memphis","TN"],["Nashville","TN"],["Knoxville","TN"],["Chattanooga","TN"],
  ["Clarksville","TN"],["Murfreesboro","TN"],["Franklin","TN"],["Johnson City","TN"],
  ["Jackson","TN"],["Kingsport","TN"],["Hendersonville","TN"],["Smyrna","TN"],
  ["Brentwood","TN"],["Cleveland","TN"],["Collierville","TN"],
  // Texas
  ["Houston","TX"],["San Antonio","TX"],["Dallas","TX"],["Austin","TX"],
  ["Fort Worth","TX"],["El Paso","TX"],["Arlington","TX"],["Corpus Christi","TX"],
  ["Plano","TX"],["Lubbock","TX"],["Laredo","TX"],["Irving","TX"],
  ["Garland","TX"],["Amarillo","TX"],["Frisco","TX"],["Grand Prairie","TX"],
  ["McKinney","TX"],["Brownsville","TX"],["Mesquite","TX"],["Killeen","TX"],
  ["McAllen","TX"],["Pasadena","TX"],["Denton","TX"],["Midland","TX"],
  ["Waco","TX"],["Carrollton","TX"],["Beaumont","TX"],["Pearland","TX"],
  ["Round Rock","TX"],["Abilene","TX"],["Richardson","TX"],["Odessa","TX"],
  ["Sugar Land","TX"],["Lewisville","TX"],["Tyler","TX"],["League City","TX"],
  ["Allen","TX"],["College Station","TX"],["Edinburg","TX"],["San Angelo","TX"],
  ["Wichita Falls","TX"],["Longview","TX"],["Mission","TX"],["Bryan","TX"],
  ["Baytown","TX"],["Missouri City","TX"],["Temple","TX"],["Pharr","TX"],
  ["New Braunfels","TX"],["Rowlett","TX"],["Conroe","TX"],["Harlingen","TX"],
  ["North Richland Hills","TX"],["Cedar Park","TX"],["Georgetown","TX"],
  ["Mansfield","TX"],["Flower Mound","TX"],["Katy","TX"],["Burleson","TX"],
  ["Edinburg","TX"],["Pflugerville","TX"],["Waxahachie","TX"],["Euless","TX"],
  ["Grapevine","TX"],["The Colony","TX"],["Wylie","TX"],["Little Elm","TX"],
  ["DeSoto","TX"],["Cedar Hill","TX"],["Abilene","TX"],["Leander","TX"],
  // Utah
  ["Salt Lake City","UT"],["West Valley City","UT"],["Provo","UT"],["West Jordan","UT"],
  ["Orem","UT"],["Sandy","UT"],["Ogden","UT"],["St. George","UT"],
  ["Layton","UT"],["Millcreek","UT"],["Taylorsville","UT"],["Murray","UT"],
  ["Herriman","UT"],["Riverton","UT"],["Lehi","UT"],["Draper","UT"],
  // Vermont
  ["Burlington","VT"],["South Burlington","VT"],["Rutland","VT"],["Montpelier","VT"],
  // Virginia
  ["Virginia Beach","VA"],["Chesapeake","VA"],["Norfolk","VA"],["Richmond","VA"],
  ["Newport News","VA"],["Alexandria","VA"],["Hampton","VA"],["Roanoke","VA"],
  ["Portsmouth","VA"],["Suffolk","VA"],["Lynchburg","VA"],["Harrisonburg","VA"],
  ["Charlottesville","VA"],["Manassas","VA"],["Fredericksburg","VA"],
  // Washington
  ["Seattle","WA"],["Spokane","WA"],["Tacoma","WA"],["Vancouver","WA"],
  ["Bellevue","WA"],["Kirkland","WA"],["Kennewick","WA"],["Renton","WA"],
  ["Spokane Valley","WA"],["Federal Way","WA"],["Bellingham","WA"],["Yakima","WA"],
  ["Redmond","WA"],["Marysville","WA"],["Kent","WA"],["Everett","WA"],
  ["Shoreline","WA"],["Richland","WA"],["Sammamish","WA"],["Pasco","WA"],
  ["Lakewood","WA"],["Kirkland","WA"],["Burien","WA"],["South Hill","WA"],
  // West Virginia
  ["Charleston","WV"],["Huntington","WV"],["Morgantown","WV"],["Parkersburg","WV"],
  ["Wheeling","WV"],
  // Wisconsin
  ["Milwaukee","WI"],["Madison","WI"],["Green Bay","WI"],["Kenosha","WI"],
  ["Racine","WI"],["Appleton","WI"],["Waukesha","WI"],["Eau Claire","WI"],
  ["Oshkosh","WI"],["Janesville","WI"],["West Allis","WI"],["La Crosse","WI"],
  ["Sheboygan","WI"],["Fond du Lac","WI"],["Wauwatosa","WI"],
  // Wyoming
  ["Cheyenne","WY"],["Casper","WY"],["Laramie","WY"],["Gillette","WY"],["Rock Springs","WY"],
]
