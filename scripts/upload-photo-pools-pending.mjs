import https from "https"

const SUPABASE_URL = "https://mmctzloztgkbqvofmkou.supabase.co"
const KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1tY3R6bG96dGdrYnF2b2Zta291Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTk5ODYzMiwiZXhwIjoyMDk1NTc0NjMyfQ.tNgs5ZJnX_FYeAZZIQo9u3cNluP_FBhjYz2IWrQ2VeI"

const pools = {
  creative_services: { photos: [
    { url: "https://images.pexels.com/photos/16313664/pexels-photo-16313664.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940", desc: "Digital artist working with graphics tablet in creative studio", tag: "graphic design" },
    { url: "https://images.pexels.com/photos/7675029/pexels-photo-7675029.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940", desc: "Group of young adults collaborating on design project in artistic workspace", tag: "graphic design" },
    { url: "https://images.pexels.com/photos/1714202/pexels-photo-1714202.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940", desc: "Stylish modern workspace with dual monitors displaying design software", tag: null },
    { url: "https://images.pexels.com/photos/7675078/pexels-photo-7675078.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940", desc: "Two people collaborating on photo editing in a creative studio", tag: "photography" },
    { url: "https://images.pexels.com/photos/8546590/pexels-photo-8546590.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940", desc: "Three women engaged in teamwork on a creative design project", tag: null },
    { url: "https://images.pexels.com/photos/16323603/pexels-photo-16323603.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940", desc: "Colleagues working on laptops in a relaxed creative office space", tag: null },
    { url: "https://images.pexels.com/photos/326518/pexels-photo-326518.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940", desc: "Modern workspace with dual monitors displaying web design projects", tag: "web design" },
    { url: "https://images.pexels.com/photos/4443133/pexels-photo-4443133.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940", desc: "Person drawing on tablet with laptop in creative home studio", tag: "graphic design" },
  ]},
  home_based_food: { photos: [
    { url: "https://images.pexels.com/photos/8653695/pexels-photo-8653695.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940", desc: "Person arranging freshly baked bread on cloth alongside coffee in warm lighting", tag: "bread" },
    { url: "https://images.pexels.com/photos/6000692/pexels-photo-6000692.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940", desc: "Freshly baked rustic bread on wooden kitchen counter with warm lighting", tag: "bread" },
    { url: "https://images.pexels.com/photos/14800849/pexels-photo-14800849.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940", desc: "Golden freshly baked bread rolls with herbs on parchment paper", tag: "bread" },
    { url: "https://images.pexels.com/photos/7669767/pexels-photo-7669767.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940", desc: "Woman holding freshly baked almond cake in her kitchen", tag: "baked goods" },
    { url: "https://images.pexels.com/photos/7966415/pexels-photo-7966415.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940", desc: "Hands holding a tray with freshly baked bread, warm and inviting", tag: "bread" },
    { url: "https://images.pexels.com/photos/37316427/pexels-photo-37316427.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940", desc: "Hands kneading dough on a floured surface in home kitchen", tag: null },
    { url: "https://images.pexels.com/photos/6482879/pexels-photo-6482879.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940", desc: "Artisan fresh baked loaf of bread with decorative pattern on top", tag: "bread" },
    { url: "https://images.pexels.com/photos/7966006/pexels-photo-7966006.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940", desc: "Hands holding freshly baked loaf of bread in a pan", tag: "bread" },
  ]},
  education: { photos: [
    { url: "https://images.pexels.com/photos/18870248/pexels-photo-18870248.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940", desc: "Male teacher helping a young student with studies in a classroom", tag: "tutoring" },
    { url: "https://images.pexels.com/photos/7156105/pexels-photo-7156105.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940", desc: "Two girls attentively studying with a tutor in a classroom setting", tag: "tutoring" },
    { url: "https://images.pexels.com/photos/7156103/pexels-photo-7156103.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940", desc: "Woman tutoring two young girls in a bright modern classroom", tag: "tutoring" },
    { url: "https://images.pexels.com/photos/6503100/pexels-photo-6503100.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940", desc: "Smiling teacher writing on whiteboard in a lively classroom with students", tag: "classroom" },
    { url: "https://images.pexels.com/photos/7942613/pexels-photo-7942613.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940", desc: "Adult helping children do homework in a light and welcoming room", tag: "tutoring" },
    { url: "https://images.pexels.com/photos/4173337/pexels-photo-4173337.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940", desc: "Girl doing homework with attentive tutor in creative study space", tag: "tutoring" },
    { url: "https://images.pexels.com/photos/7156106/pexels-photo-7156106.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940", desc: "Teacher instructing two students at a desk in a modern environment", tag: null },
    { url: "https://images.pexels.com/photos/18870251/pexels-photo-18870251.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940", desc: "Teacher helping students with schoolwork in a modern classroom", tag: "classroom" },
  ]},
  music_performance: { photos: [
    { url: "https://images.pexels.com/photos/7715347/pexels-photo-7715347.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940", desc: "Musician playing acoustic guitar on stage with dramatic yellow and blue lights", tag: "acoustic" },
    { url: "https://images.pexels.com/photos/3947517/pexels-photo-3947517.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940", desc: "Two musicians performing acoustic music outdoors at night with soft ambient lighting", tag: "acoustic" },
    { url: "https://images.pexels.com/photos/1588075/pexels-photo-1588075.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940", desc: "Dynamic live band performance featuring instruments and musicians on stage", tag: "band" },
    { url: "https://images.pexels.com/photos/1652361/pexels-photo-1652361.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940", desc: "Lively concert scene with vivid lighting, singer and full band on stage", tag: "band" },
    { url: "https://images.pexels.com/photos/416831/pexels-photo-416831.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940", desc: "Dynamic live rock band performance with vibrant stage lights and enthusiastic crowd", tag: "band" },
    { url: "https://images.pexels.com/photos/3881832/pexels-photo-3881832.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940", desc: "Guitarist on stage with an engaged crowd at a live concert", tag: "acoustic" },
    { url: "https://images.pexels.com/photos/8040838/pexels-photo-8040838.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940", desc: "Energetic jazz musicians with guitar and piano creating soulful entertainment", tag: "jazz" },
    { url: "https://images.pexels.com/photos/12298227/pexels-photo-12298227.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940", desc: "Silhouetted band performing live in a dimly lit venue, essence of live music", tag: "band" },
  ]},
  professional_services: { photos: [
    { url: "https://images.pexels.com/photos/20752572/pexels-photo-20752572.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940", desc: "Diverse group of professionals in a business consulting office setting", tag: null },
    { url: "https://images.pexels.com/photos/4872035/pexels-photo-4872035.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940", desc: "Three young professionals discussing documents in a modern office space", tag: null },
    { url: "https://images.pexels.com/photos/5816296/pexels-photo-5816296.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940", desc: "Business professionals discussing financial data during a collaborative meeting", tag: "finance" },
    { url: "https://images.pexels.com/photos/5439162/pexels-photo-5439162.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940", desc: "Three professionals in a collaborative office meeting with laptops and notes", tag: null },
    { url: "https://images.pexels.com/photos/7654609/pexels-photo-7654609.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940", desc: "Business professionals reviewing documents with focus on teamwork", tag: null },
    { url: "https://images.pexels.com/photos/23496863/pexels-photo-23496863.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940", desc: "Two businessmen discussing work at a cafe with laptops and coffee", tag: null },
    { url: "https://images.pexels.com/photos/8204963/pexels-photo-8204963.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940", desc: "Professional consultation session with clients in a modern office environment", tag: "consulting" },
    { url: "https://images.pexels.com/photos/7580781/pexels-photo-7580781.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940", desc: "Professional discussing paperwork with client in a relaxed office setting", tag: null },
  ]},
  healthcare: { photos: [
    { url: "https://images.pexels.com/photos/8460084/pexels-photo-8460084.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940", desc: "Medical professional examines patient with stethoscope in clinic examination room", tag: null },
    { url: "https://images.pexels.com/photos/6129444/pexels-photo-6129444.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940", desc: "Doctor discusses health records with a patient in a clinical setting", tag: null },
    { url: "https://images.pexels.com/photos/7447009/pexels-photo-7447009.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940", desc: "Female doctor giving a health check-up to a child in a bright clinic", tag: "pediatric" },
    { url: "https://images.pexels.com/photos/8460371/pexels-photo-8460371.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940", desc: "Diverse healthcare professionals in a clinical setting showcasing teamwork", tag: null },
    { url: "https://images.pexels.com/photos/6129450/pexels-photo-6129450.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940", desc: "Doctors and nurses interacting in a hospital hallway, teamwork and professionalism", tag: null },
    { url: "https://images.pexels.com/photos/6129209/pexels-photo-6129209.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940", desc: "Two doctors in lab coats discussing an X-ray in a clinical setting", tag: null },
    { url: "https://images.pexels.com/photos/7659869/pexels-photo-7659869.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940", desc: "Patient consulting a doctor with clipboard in a modern medical setting", tag: null },
    { url: "https://images.pexels.com/photos/6627936/pexels-photo-6627936.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940", desc: "Medical professional in scrubs reviewing documents at an office desk", tag: null },
  ]},
  childcare: { photos: [
    { url: "https://images.pexels.com/photos/8422170/pexels-photo-8422170.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940", desc: "Kids at a preschool table playing with colorful clay, fostering creativity", tag: null },
    { url: "https://images.pexels.com/photos/8612970/pexels-photo-8612970.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940", desc: "Kids enjoying playtime with toys and blocks in a bright kindergarten classroom", tag: null },
    { url: "https://images.pexels.com/photos/8422191/pexels-photo-8422191.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940", desc: "Children and a teacher playing with toys in a kindergarten setting", tag: null },
    { url: "https://images.pexels.com/photos/8535183/pexels-photo-8535183.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940", desc: "Children playing with blocks and cardboard house in a cozy classroom", tag: null },
    { url: "https://images.pexels.com/photos/11163731/pexels-photo-11163731.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940", desc: "Happy children playing indoors with toys, showcasing joyful interaction", tag: null },
    { url: "https://images.pexels.com/photos/8422255/pexels-photo-8422255.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940", desc: "Kids engaging in play and learning activities in a colorful kindergarten", tag: null },
    { url: "https://images.pexels.com/photos/8535591/pexels-photo-8535591.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940", desc: "Group of young children playing in a well-decorated kindergarten classroom", tag: null },
    { url: "https://images.pexels.com/photos/8613299/pexels-photo-8613299.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940", desc: "Children in a circle on wooden floor engaging in fun indoor activities", tag: null },
  ]},
  makers_crafts: { photos: [
    { url: "https://images.pexels.com/photos/34230986/pexels-photo-34230986.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940", desc: "Potter's hands skillfully shaping clay on a pottery wheel in a studio", tag: "pottery" },
    { url: "https://images.pexels.com/photos/29418319/pexels-photo-29418319.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940", desc: "Artisan hands skillfully shaping clay pottery on a spinning wheel indoors", tag: "pottery" },
    { url: "https://images.pexels.com/photos/22823/pexels-photo.jpg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940", desc: "Close-up of hands shaping clay on a pottery wheel, the art of ceramics", tag: "pottery" },
    { url: "https://images.pexels.com/photos/19867571/pexels-photo-19867571.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940", desc: "Experienced artisan shaping clay into a pot on pottery wheel in rustic workshop", tag: "pottery" },
    { url: "https://images.pexels.com/photos/4706105/pexels-photo-4706105.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940", desc: "Man crafting pottery in a studio, traditional clay molding techniques", tag: "pottery" },
    { url: "https://images.pexels.com/photos/20242195/pexels-photo-20242195.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940", desc: "Artisan crafting clay pots in a traditional workshop setting", tag: "pottery" },
    { url: "https://images.pexels.com/photos/11487830/pexels-photo-11487830.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940", desc: "Artisan shaping a clay pot on a wheel, showcasing traditional techniques", tag: "pottery" },
    { url: "https://images.pexels.com/photos/37364782/pexels-photo-37364782.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940", desc: "Skilled artisan crafting clay pottery in a rustic workshop", tag: "pottery" },
  ]},
  home_property: { photos: [
    { url: "https://images.pexels.com/photos/7415125/pexels-photo-7415125.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940", desc: "Family explores a newly purchased home with real estate agent guiding them", tag: null },
    { url: "https://images.pexels.com/photos/7415120/pexels-photo-7415120.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940", desc: "Professional woman inspecting property for real estate with modern interior", tag: null },
    { url: "https://images.pexels.com/photos/6934267/pexels-photo-6934267.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940", desc: "Interior of modern studio apartment with TV, sofa and kitchen", tag: null },
    { url: "https://images.pexels.com/photos/3935326/pexels-photo-3935326.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940", desc: "Sunlit dining room with wooden table and wicker chairs, luxury interior design", tag: null },
    { url: "https://images.pexels.com/photos/6835179/pexels-photo-6835179.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940", desc: "Bright airy open floor plan with hardwood flooring and white kitchen cabinets", tag: null },
    { url: "https://images.pexels.com/photos/3935315/pexels-photo-3935315.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940", desc: "Inviting living room with large windows, modern decor, and wooden flooring", tag: null },
    { url: "https://images.pexels.com/photos/3935316/pexels-photo-3935316.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940", desc: "Spacious living room with wooden French doors and ceiling fan", tag: null },
    { url: "https://images.pexels.com/photos/8146144/pexels-photo-8146144.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940", desc: "Spacious modern interior with open kitchen and living area, elegant wooden flooring", tag: null },
  ]},
  nonprofit: { photos: [
    { url: "https://images.pexels.com/photos/6591154/pexels-photo-6591154.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940", desc: "Four diverse volunteers packing food donations with teamwork and dedication", tag: "food bank" },
    { url: "https://images.pexels.com/photos/6646926/pexels-photo-6646926.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940", desc: "Volunteers handing out donations to those in need at a community event", tag: null },
    { url: "https://images.pexels.com/photos/7156162/pexels-photo-7156162.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940", desc: "Diverse group of young volunteers organizing donations with a cheerful atmosphere", tag: null },
    { url: "https://images.pexels.com/photos/7156163/pexels-photo-7156163.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940", desc: "Three volunteers organizing donation boxes with clothes and food in community center", tag: null },
    { url: "https://images.pexels.com/photos/6590928/pexels-photo-6590928.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940", desc: "Three volunteers organizing food donations into boxes, community support in action", tag: "food bank" },
    { url: "https://images.pexels.com/photos/6647041/pexels-photo-6647041.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940", desc: "Two volunteers visiting a home to offer community support and services", tag: null },
    { url: "https://images.pexels.com/photos/6646916/pexels-photo-6646916.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940", desc: "Volunteers providing food and aid to a person in a wheelchair outdoors", tag: null },
    { url: "https://images.pexels.com/photos/7156161/pexels-photo-7156161.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940", desc: "Diverse volunteers organizing donated items in a community center", tag: null },
  ]},
}

async function upload(path, data) {
  const body = JSON.stringify(data)
  return new Promise((resolve, reject) => {
    const urlObj = new URL(`${SUPABASE_URL}/storage/v1/object/config/${path}`)
    const req = https.request({
      hostname: urlObj.hostname,
      path: urlObj.pathname,
      method: "PUT",
      headers: {
        "Authorization": `Bearer ${KEY}`,
        "apikey": KEY,
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(body),
        "x-upsert": "true",
      }
    }, res => {
      let d = ""
      res.on("data", c => d += c)
      res.on("end", () => resolve({ path, status: res.statusCode }))
    })
    req.on("error", reject)
    req.write(body)
    req.end()
  })
}

// Upload to BOTH live and pending so the panel shows team picks for Shawn to approve
const uploads = Object.entries(pools).flatMap(([industry, data]) => [
  upload(`photo-pools/${industry}.json`, data),
  upload(`photo-pools/${industry}.pending.json`, data),
])

const results = await Promise.all(uploads)
results.forEach(r => console.log(r.status === 200 ? "✅" : "❌", r.path, r.status))
