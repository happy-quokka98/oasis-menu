# Dreamland Oasis Menu Backend & API — გამოყენების ინსტრუქცია (გაიდლაინი)

ეს პროექტი წარმოადგენს **Node.js + Express + MongoDB (Mongoose)** ბექენდ სერვისს, სადაც ატვირთულია **Dreamland Oasis**-ის სამივე რესტორნის სრული მენიუ:
1. **Georgian Restaurant** (`Georgian-Restaurant`, ID: `10008`)
2. **Sky Lounge** (`Sky-Lounge`, ID: `10009`)
3. **Beach Bar** (`Beach-Bar`, ID: `10010`)

---

## 1. პროექტის სტრუქტურა

- [`.env`](file:///c:/Users/kakhi/OneDrive/Documents/projects/scr/.env) — გარემოს ცვლადები (`MONGODB_URI` და `PORT`).
- [`models.js`](file:///c:/Users/kakhi/OneDrive/Documents/projects/scr/models.js) — MongoDB-ს სქემები (`Restaurant`, `Category`, `MenuItem`).
- [`seed.js`](file:///c:/Users/kakhi/OneDrive/Documents/projects/scr/seed.js) — სკრიპტი, რომელიც კითხულობს [`dreamland_menus.json`](file:///c:/Users/kakhi/OneDrive/Documents/projects/scr/dreamland_menus.json) ფაილს და ტვირთავს მონაცემებს MongoDB Atlas-ში.
- [`server.js`](file:///c:/Users/kakhi/OneDrive/Documents/projects/scr/server.js) — Express REST API სერვერი.

---

## 2. გაშვების ინსტრუქცია

### ნაბიჯი 1: პაკეტების ინსტალაცია
```bash
npm install
```

### ნაბიჯი 2: მონაცემების ატვირთვა / განახლება MongoDB-ში (Seeding)
*(მონაცემები უკვე ატვირთულია ბაზაში `dreamland_oasis`, მაგრამ თუ თავიდან გსურთ გადაწერა, გაუშვით):*
```bash
npm run seed
```

### ნაბიჯი 3: API სერვერის ჩართვა
```bash
npm start
```
სერვერი გაეშვება მისამართზე: `http://localhost:3000`

---

## 3. მონაცემთა ბაზის კოლექციები (MongoDB Collections)

მონაცემები ინახება ბაზაში **`dreamland_oasis`** სამ კოლექციაში:
1. **`restaurants`** — 3 რესტორნის სრული ინფორმაცია (სახელები 3 ენაზე, სამუშაო საათები, ფერები, სურათების ლინკები და სრული ჩაშენებული მენიუ `menuTree`).
2. **`categories`** — ყველა მთავარი კატეგორია და ქვეკატეგორია (`parentId`-ით დაკავშირებული).
3. **`menuitems`** — ყველა კერძი და სასმელი ცალ-ცალკე დოკუმენტად, რაც საშუალებას იძლევა სწრაფად მოძებნოთ, გაფილტროთ ფასით ან შეცვალოთ ნებისმიერი კერძი.

---

## 4. API ენდფოინთები და მათი გამოყენება

### 4.1. ყველა რესტორნის წამოღება
- **URL:** `GET /api/restaurants`
- **პარამეტრები (არასავალდებულო):**
  - `?includeMenu=true` — თუ გსურთ რესტორნებთან ერთად მთლიანი მენიუს ხეც წამოვიდეს.
- **მაგალითი:**
  ```bash
  curl http://localhost:3000/api/restaurants
  ```

---

### 4.2. კონკრეტული რესტორნის ინფორმაციის წამოღება
- **URL:** `GET /api/restaurants/:identifier`
- `:identifier` შეიძლება იყოს როგორც `slug` (`Georgian-Restaurant`, `Sky-Lounge`, `Beach-Bar`), ასევე `restaurantId` (`10008`, `10009`, `10010`).
- **მაგალითი:**
  ```bash
  curl http://localhost:3000/api/restaurants/Georgian-Restaurant
  ```

---

### 4.3. რესტორნის სრული მენიუს წამოღება (კატეგორიებით, ქვეკატეგორიებით და კერძებით)
- **URL:** `GET /api/restaurants/:identifier/menu`
- **პარამეტრები (არასავალდებულო):**
  - `?lang=ge` | `en` | `ru` — ავტომატურად აყენებს `name` და `description` ველებს არჩეულ ენაზე.
- **მაგალითი (ქართულ ენაზე):**
  ```bash
  curl "http://localhost:3000/api/restaurants/Sky-Lounge/menu?lang=ge"
  ```

---

### 4.4. კატეგორიების წამოღება
- **URL:** `GET /api/categories`
- **პარამეტრები (არასავალდებულო):**
  - `?restaurant=Beach-Bar` — კონკრეტული რესტორნის კატეგორიები.
  - `?mainOnly=true` — მხოლოდ მთავარი კატეგორიები (ქვეკატეგორიების გარეშე).
  - `?parentId=53` — კონკრეტული მთავარი კატეგორიის ქვეკატეგორიები.
- **მაგალითი:**
  ```bash
  curl "http://localhost:3000/api/categories?restaurant=Georgian-Restaurant&mainOnly=true"
  ```

---

### 4.5. კონკრეტული კატეგორიის კერძების წამოღება
- **URL:** `GET /api/categories/:categoryId/items`
- აბრუნებს როგორც ამ კატეგორიის, ასევე მისი ქვეკატეგორიების კერძებს.
- **მაგალითი:**
  ```bash
  curl "http://localhost:3000/api/categories/85/items?lang=ge"
  ```

---

### 4.6. კერძების ძებნა და ფილტრაცია
- **URL:** `GET /api/items`
- **პარამეტრები (ყველა არასავალდებულოა):**
  - `restaurant` — მაგ: `Georgian-Restaurant`, `Sky-Lounge` ან `Beach-Bar`
  - `categoryId` — კატეგორიის ID (მაგ: `85`)
  - `search` — საძიებო სიტყვა ქართულად, ინგლისურად ან რუსულად (მაგ: `ხაჭაპური`, `khachapuri`, `pizza`)
  - `minPrice` — მინიმალური ფასი (მაგ: `15`)
  - `maxPrice` — მაქსიმალური ფასი (მაგ: `40`)
  - `lang` — `ge`, `en`, ან `ru`
  - `page` და `limit` — გვერდებად დაყოფა (Pagination, ნაგულისხმევად `limit=200`, `page=1`)
- **მაგალითი:**
  ```bash
  curl "http://localhost:3000/api/items?restaurant=Georgian-Restaurant&search=ხაჭაპური&minPrice=10&maxPrice=35&lang=ge"
  ```

---

### 4.7. ერთი კონკრეტული კერძის ნახვა ID-ით
- **URL:** `GET /api/items/:itemId`
- **მაგალითი:**
  ```bash
  curl "http://localhost:3000/api/items/142?lang=ge"
  ```

---

### 4.8. ახალი კერძის დამატება (`POST`), განახლება (`PUT`) და წაშლა (`DELETE`)

#### ახალი კერძის დამატება:
- **URL:** `POST /api/items`
- **Body (JSON):**
  ```json
  {
    "categoryId": 85,
    "restaurantId": 10008,
    "restaurantSlug": "Georgian-Restaurant",
    "name_ge": "მეგრული ხაჭაპური",
    "name_en": "Megrelian Khachapuri",
    "name_ru": "Мегрельский хачапури",
    "description_ge": "იმერული ყველი და სულგუნი",
    "price": 30
  }
  ```

#### კერძის რედაქტირება (მაგ. ფასის შეცვლა):
- **URL:** `PUT /api/items/:itemId`
- **Body (JSON):**
  ```json
  {
    "price": 32.00
  }
  ```

#### კერძის წაშლა:
- **URL:** `DELETE /api/items/:itemId`

---

## 5. Frontend-ში (JavaScript / React) გამოყენების მაგალითი

```javascript
// მაგალითი 1: ქართული რესტორნის მთლიანი მენიუს წამოღება ქართულ ენაზე
async function loadGeorgianMenu() {
  const response = await fetch('http://localhost:3000/api/restaurants/Georgian-Restaurant/menu?lang=ge');
  const data = await response.json();
  console.log('რესტორანი:', data.restaurant.title_ge);
  console.log('კატეგორიები:', data.menu);
}

// მაგალითი 2: კერძის ძებნა
async function searchDishes(keyword) {
  const response = await fetch(`http://localhost:3000/api/items?search=${encodeURIComponent(keyword)}&lang=ge`);
  const result = await response.json();
  console.log(`ნაპოვნია ${result.total} კერძი:`, result.data);
}
```
