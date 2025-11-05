### Recipe Almanac ###
'''
This is the Recipe Almanac, a digital recipe book you can, share, browse and write your own.
I am tired of recipe pages that just want your email to add you to mailing list or want you to pay for a subscription or just covered in ads.
This page will never have any of those and is here to be every cook's and bakers recipe book
'''

## Website details ##
This website is built on A React framework and use DaisyUI components and plugins
the backend uses node.js and sql for Database management and connects to PostgreSQL as the DBMS system for local testing the db is local though after launch the webapp will be connected to supabase or another opensource db

## Global ##
`Header`
    Home button as the website logo *logo.png* 
    My profile page round icon (if a profile picture is not added or user not logged in daisy img is used <img src="https://img.daisyui.com/images/profile/demo/batperson@192.webp" />)
    My almanac page / or a Log IN button if the user is not logged on
    A moon icon to change the page to dark mode or sun icon to change to light mode if already on dark mode (should take browser default setting) using daisy theme controller component
    github logo (page link to https://github.com/moayed-abdalla/Recipe_Almanac/) 
    Coffee icon (leads to https://buymeacoffee.com/moayed_abdalla)

`Footer`
    Home button as the logo
    My profile page 
    My almanac page 
    github logo (page link to https://github.com/moayed-abdalla/Recipe_Almanac/) 

## Pages ##
`Home`
    Search bar to be able to search for a recipe (should be able to find either similar names or tags associated with the recipe)
    List of all public recipes in order of most viewed
    side bar that opens when you click on the profile page icon (this side bar should only be accessible on the homepage)

`Almanac page`
    list of recipes, should have a 2 filter categories, first filter category is for My recipes or Saved recipes, the second category is the food category whic is just based on the tags that people have added to the recipe

`Recipe Page`
    Recipe picture
    Recipe title / Recipe owner (should link to owners page)
    Tags associated with recipe (light grey for light mode and dark grey for dark mode)
    Ingredients heading
    Ingredients list (Check boxes) on the back 
    Units change button there should be a dictionary that is the volume to grams conversion rate for a given ingredient for example {flour:0.5} meaning for this the weight per ml.
    there should also be a volumetric dictionary for each unit {US cups:250, teaspoon:5,tablespoon:15} 
    Method Heading
    Method steps (numbered list)
    Notes Heading
    Notes (numbered list)
    Recipe page should be found https://website_link/profile_name/recipe_name/

`Recipe Writing Page`
    Recipe title
    Insert Recipe picture
    Tags (user is allowed to write multiple tags here)
    Ingredients measurements (Must be either cups, teaspoon) / Ingredient unit selection dropdown / Ingredient description  
    Method heading
    Method numbered list
    Notes Heading
    Notes numbered list
    Recipe editing page should be found https://website_link/profile_name/recipe_name/edit (must be logged in to edit, users can only edit their recipes)

`Profile page`
    details and page views and ratings dashboard
    link sharing profile in link as https://_____.______/U/profile/recipe____

`Profile creation page`
    Username
    Password
    Confirm Password
    Email (optional) meantion is optional and only used for sign in

## Databases ##
`user database with a Primary key for the DB is User's username`
    Attributes (Username, user_mail, user_password, profile_description, profile_picture)

`Recipe database will have a composite key of the username and recipe_name`
    Attributes (Username_of_owner, recipe_name, recipe_picture, recipe_description, recipe_ingredient_amount, recipe_ingredient_unit, view_count)

`Almanac page` list of recipes a user owns or has saved
    Attribute (Username, recipe_name, recipe_picture)

## Page Colors ##
light mode color pallete
    lg_bg: #E6C59E `light mode background`
    lg_secondary: #F2E2CE `light mode secondary background`
    lg_font: #191510 `light mode font color`
    lg_light_accent: #d7d9ea `light mode light accent color`
    lg_dark_accent: #0e101b `light mode dark accent color`

dark mode color pallete
    dk_bg: #0E101B `dark mode background`
    dk_secondary: #353745 `dark mode secondary background`
    dk_font: #d7d9ea `dark mode font color`
    dk_light_accent: #F2E2CE `dark mode light accent color`
    dk_dark_accent: #E6C59E `dark mode dark accent color`

## project structure ##
Recipe_Almanac/
├── server/
│   ├── controllers/
│   ├── database/
│      ├── init.js
│      └── pool.js
│   ├── middleware/
│      ├── auth.js
│      └──rateLimit.js
│   ├── models/
│   ├── node_modules/
│   ├── routes/
│       ├── almanac.js
│       ├── auth.js
│       ├── recipes.js
│       └── users.js
│   ├── uploads/
│   ├── package.json 
│   ├── package-lock.json 
│   ├── server.js 
│   └── vercel.json
│
├── client/
│   ├── .vite/
│   ├── node_modules/
│   ├── public/
│   ├── src/
│       ├── assets/
│           ├── logo.png
│           └── react.svg
│       ├── components/
│           ├── Footer.jsx
│           ├── Header.jsx
│           ├── RecipeCard.jsx
│           └── SearchBar.jsx
│       ├── pages/
│           ├── AlmanacPage.jsx
│           ├── Home.jsx
│           ├── LoginPage.jsx
│           ├── ProfilePage.jsx
│           ├── RecipeCreate.jsx
│           ├── RecipeEdit.jsx
│           ├── RecipePage.jsx
│           └── RegisterPage.jsx
│       ├── services/
│           └── api.js
│       ├── utils/
│           └── unitConverter.js
│       ├── App.jsx
│       ├── index.css
│       └── main.jsx
│   ├── .gitignore
│   ├── eslint.config.js
│   ├── index.html
│   ├── package-lock.json
│   ├── package.json
│   ├── pnpm-lock.yaml
│   ├── postcss.config.js
│   ├── tailwind.config.js
│   ├── vercel.json
│   └── vite.config.js
│ 
├── package.json
├── package-lock.json
├── Readme.md
└── .gitignore
