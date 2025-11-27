import { redirect } from 'next/navigation';

// Redirect /write_recipe to /recipe/create
export default function WriteRecipePage() {
  redirect('/recipe/create');
}

