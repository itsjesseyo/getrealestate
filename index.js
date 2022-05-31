const scrapeIt = require("scrape-it") // the webscraper
const axios = require('axios') // used to make url requests
const fetch  = require('node-fetch') // also used for web requests because i had issues
const print = console.log

const schedule = require('node-schedule')

const time = require('dayjs')

const env = require('node-env-file');
env(__dirname + '/.env');
const {APPWRITE_PROJECT, APPWRITE_KEY} = process.env

const sdk = require('node-appwrite');
const {Query} = sdk
const client = new sdk.Client();
client
    .setEndpoint('http://147.182.196.214/v1') // Your API Endpoint
    .setProject(APPWRITE_PROJECT) // Your project ID
    .setKey(APPWRITE_KEY); // Your secret API key
let db = new sdk.Database(client);
const COLLECTION_ID = '62942eb0a4f128287cbc'


let batchTime = 0


/* This code goes to the below URL and fetches the most recent houses from utahrealestate */
// the bottom lines (processNew) is what actually launches the process

// i basically just followed the example from the scrape-it docs
// https://www.npmjs.com/package/scrape-it

// const url = "https://www.utahrealestate.com/1795017"
const rootUrl = "https://www.utahrealestate.com/"


// this is to clean data of certain properties in scrape-it
const extractFeatureByName = (featureName, features, isNumber = true) => {
    for(const feature of features){
        if( feature.toLowerCase().includes(featureName)){
            const value = feature.toLowerCase().replace(`${featureName}: `, "")
            return isNumber ? Number(value) : value
        }
    }
}
// this is to better exctract the sqft value in scrape-it data
const breakoutSqFoot = (house) => {
    const { features } = house
    for( let feature of features ){
        if(feature.includes(' sq. ft.')){
            feature = feature.replace(' sq. ft.', '')
            const fragments = feature.split(': ')
            if(fragments[0] !== "Total"){
                house[fragments[0].replace(" ", '-')] = Number(fragments[1])
            }
        }
    }
}

// this does not work
const addRoomCount = (house) => {
    const { features } = house
    for(let feature of features){
        if(feature.includes(';')){
            if(feature.includes('Floor 1: ')){
                count = feature.split(';').length
                house["room_count"] = count
            }
        }
    }
}

// this is the actual webscraping
const processHouse = async (url) => {

    const response = await axios.get(url)
    const house = await scrapeIt.scrapeHTML(response.data, {
        address_1: ".prop___overview h2",
        address_2: ".prop___overview p",
        zipcode: {
          selector: ".prop___overview p",
          convert: x => Number(x.split(' ').pop())
        },
        city: {
          selector: ".prop___overview p",
          convert: x => x.split(', UT').shift()
        },
        map_url: {
            selector: ".prop___adress___wrap li a",
            attr: "href"
        },
        price: {
            selector: ".prop-details-overview li:nth-child(1) span:first",
            convert: x => Number(x.replace("$", "").replace(",", ""))
        },
        beds: {
            selector: ".prop-details-overview li:nth-child(2) span",
            convert: x => Number(x)
        },
        baths: {
            selector: ".prop-details-overview li:nth-child(3) span",
            convert: x => Number(x)
        },
        sq_footage: {
            selector: ".prop-details-overview li:nth-child(4) span",
            convert: x => Number(x)
        },
        days_listed: {
            selector: ".facts___list___items li:nth-child(1) > div > div",
            convert: x =>  ( x.split('\n')[1].replace(/\s+/, "") === "Just Listed" )? 0 : Number(x.split('\n')[1].replace(/\s+/, ""))
        },
        status: {
            selector: ".facts___list___items li:nth-child(2) > div > div",
            convert: x => x.split('\n')[1].replace(/\s+/, "") 
        },
        mls: {
            selector: ".facts___list___items li:nth-child(3) > div > div",
            convert: x => Number(x.split('\n')[1].replace(/\s+/, ""))
        },
        type: {
            selector: ".facts___list___items li:nth-child(4) > div > div",
            convert: x => x.split('\n')[1].replace(/\s+/, "") 
        },
        style: {
            selector: ".facts___list___items li:nth-child(5) > div > div",
            convert: x => x.split('\n')[1].replace(/\s+/, "") 
        },
        year: {
            selector: ".facts___list___items li:nth-child(6) > div > div",
            convert: x => Number(x.split('\n')[1].replace(/\s+/, "")) 
        },
        images: {
            listItem: "#image-gallery li",
            data: {
                image: {
                    attr: "data-src"
                },
                thumbnail: {
                    attr: "data-thumb"
                }
            }
        },
        description: ".features-wrap p:nth-child(1)",
        features: {
            listItem: ".features-wrap ul li",
            
        },
        agent_name: {
            selector: ".agent-overview-content",
            convert: x => x.split("\n")[0].trim()
        },
        agent_phone: {
            selector: ".agent-overview-content",
            convert: x => x.split("\n")[1]?.replace(/\s+/, "") || ""
        }
    })

    house["acres"] = extractFeatureByName("acres", house.features)
    breakoutSqFoot(house)
    house.url = url
    // addRoomCount(house)
    return house
}

const getLatestHouses = async () => {
    const response = await fetch("https://www.utahrealestate.com/search/chained.update/param_reset/county_code,o_county_code,city,o_city,zip,o_zip,geometry,o_geometry/count/false/criteria/false/pg/1/limit/50/dh/707/using_map_viewport/true", {
        "headers": {
          "accept": "application/json, text/javascript, */*; q=0.01",
          "accept-language": "en-US,en;q=0.9",
          "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
          "sec-ch-ua": "\" Not A;Brand\";v=\"99\", \"Chromium\";v=\"98\", \"Google Chrome\";v=\"98\"",
          "sec-ch-ua-mobile": "?0",
          "sec-ch-ua-platform": "\"macOS\"",
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "same-origin",
          "sec-gpc": "1",
          "x-requested-with": "XMLHttpRequest",
          "cookie": "_uc_referrer=https://duckduckgo.com/; _pbjs_userid_consent_data=3524755945110770; _lr_env_src_ats=false; ure-cookie-policy-agree=1; PHPSESSID=84bdhho0geafkob734gkr7tujv; ureServerSession=164643291008441605500; _lr_retry_request=true; ureBrowserSession=164643291008441605500",
          "Referer": "https://www.utahrealestate.com/search/map.search",
          "Referrer-Policy": "strict-origin-when-cross-origin"
        },
        "body": "param=geometry&value=POLYGON%28%28-112.30373041015639%2040.13236442187599%2C-112.30373041015639%2040.870626292919155%2C-111.57313958984375%2040.870626292919155%2C-111.57313958984375%2040.13236442187599%2C-112.30373041015639%2040.13236442187599%29%29&chain=saveLocation,criteriaAndCountAction,mapInlineResultsAction&all=1&accuracy=&geocoded=&state=&box=&htype=&lat=&lng=&selected_listno=&type=1&geolocation=&listprice1=200000&listprice2=600000&tot_bed1=&tot_bath1=&stat=1&stat=7&status=1%2C7&opens=&o_env_certification=32&proptype=1&style=&o_style=4&tot_sqf1=&dim_acres1=&yearblt1=&cap_garage1=&o_has_solar=1&o_seniorcommunity=1&o_has_hoa=1&o_accessibility=32&loc=&accr=&op=16777216&advanced_search=0&param_reset=housenum,dir_pre,street,streettype,dir_post,city,county_code,zip,area,subdivision,quadrant,unitnbr1,unitnbr2,geometry,coord_ns1,coord_ns2,coord_ew1,coord_ew2,housenum,o_dir_pre,o_street,o_streettype,o_dir_post,o_city,o_county_code,o_zip,o_area,o_subdivision,o_quadrant,o_unitnbr1,o_unitnbr2,o_geometry,o_coord_ns1,o_coord_ns2,o_coord_ew1,o_coord_ew2",
        "method": "POST"
      });
    let { listing_data, page_count } = await response.json()
    // for each page of houses i glue them into the data bundle
    if( page_count > listing_data.length ){
        const pages = Math.ceil(page_count/listing_data.length)
        for(var i = 0; i < pages; i++){
            const additional_pages = await getPageOfHouses(i + 1)
            listing_data = listing_data.concat(additional_pages)
        }
    }
    return listing_data
}

// just a url call to get json
const getPageOfHouses = async (page) => {
    const response = await fetch(`https://www.utahrealestate.com/search/map.inline.results/pg/${page}/sort/entry_date_desc/paging/1/dh/707`, {
    "headers": {
        "accept": "application/json, text/javascript, */*; q=0.01",
        "accept-language": "en-US,en;q=0.9",
        "sec-ch-ua": "\" Not A;Brand\";v=\"99\", \"Chromium\";v=\"98\", \"Google Chrome\";v=\"98\"",
        "sec-ch-ua-mobile": "?0",
        "sec-ch-ua-platform": "\"macOS\"",
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
        "sec-gpc": "1",
        "x-requested-with": "XMLHttpRequest",
        "cookie": "_uc_referrer=https://duckduckgo.com/; _pbjs_userid_consent_data=3524755945110770; _lr_env_src_ats=false; ure-cookie-policy-agree=1; PHPSESSID=84bdhho0geafkob734gkr7tujv; ureServerSession=1646443850526273437500; ureBrowserSession=164643291008441605500",
        "Referer": "https://www.utahrealestate.com/search/map.search/page/2/vtype/map",
        "Referrer-Policy": "strict-origin-when-cross-origin"
    },
    "body": null,
    "method": "POST"
    });
    const { listing_data } = await response.json()
    return listing_data
}

function pause(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// the main process
const processNew = async () => {
  batchTime = time().millisecond(0).second(0).minute(0).unix()
  // print(time.unix(batchTime).format('MM/DD/YYYY HH:mm:ss'))
  // get a list of houses, 
  const houseCodes = await getLatestHouses()
  // but not much data in it so go to each page seprately
  const listingUrls = houseCodes.map(listing => `${rootUrl}${listing.listno}`)
  // const max = 4
  // let index = 0
  for(const url of listingUrls){
    // if(index < max){
      // processHouse uses scrape-it to get the data
      const house = await processHouse(url)
      // print(house)
      await addHouseIfNew(house)
      await pause(1000) // be a good citizena nd avoid being banned
      // index++
    // }
  }
}

const getHouseEntry = async (mls) => {
  let entry = await db.listDocuments(COLLECTION_ID, [
    Query.equal('mls', mls)
  ], 1);
  return entry.total === 0 ? null : entry
}

const createEntry = async (house) => {
  house.images = house.images.map(item => item.image)
  house.batch = batchTime
  house.created = time().unix()
  const newHouse = await db.createDocument(COLLECTION_ID, 'unique()', house);
  return newHouse
}

const addHouseIfNew = async (house) => {
  const entry = await getHouseEntry(house.mls)
  if(entry === null){
    print('creating...')
    const newHouse = await createEntry(house)
    print(newHouse.mls)
  }else{
    print('entry exists', house.mls)
  }
}
processNew()

const rule = new schedule.RecurrenceRule();
rule.hour = [0, new schedule.Range(6, 18, 3)];

const job = schedule.scheduleJob(rule, function(){
  console.log('Running job: ', time().format('HH:mm:ss'))
  processNew()
});