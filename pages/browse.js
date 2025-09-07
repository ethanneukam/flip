// pages/browse.js
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import Link from "next/link";

export default function BrowsePage() {
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    fetchCategories();
    fetchItems();
  }, []);

  useEffect(() => {
    // debounce if you want; keep simple for MVP
    fetchItems();
  }, [search, category]);

  async function fetchCategories() {
    const { data, error } = await supabase.from("categories").select("name").order("name");
    if (!error) setCategories(data.map(r => r.name));
  }

  async function fetchItems() {
    let query = supabase.from("items").select("*");

    if (category) query = query.eq("category", category);

    if (search) {
      // search title OR description
      const orQuery = `title.ilike.%${search}%,description.ilike.%${search}%`;
      query = query.or(orQuery);
    }

    const { data, error } = await query.order("created_at", { ascending: false }).limit(100);
    if (error) {
      console.error("fetch items error", error);
      setItems([]);
    } else {
      setItems(data || []);
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl mb-4">Browse Items</h1>
      <div className="flex gap-2 mb-4">
        <input className="flex-1 p-2 border" placeholder="Search title or description" value={search} onChange={e=>setSearch(e.target.value)} />
        <select className="p-2 border" value={category} onChange={e=>setCategory(e.target.value)}>
          <option value="">All categories</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <button className="p-2 border" onClick={()=>{ setSearch(""); setCategory(""); }}>Reset</button>
      </div>

      <ul className="space-y-4">
        {items.map(item => (
          <li key={item.id} className="p-4 border rounded flex gap-4">
            {item.image_url ? <img src={item.image_url} alt={item.title} style={{width:120,height:120,objectFit:'cover'}} /> : <div style={{width:120,height:120,background:'#eee'}}/>}
            <div>
              <h2 className="font-bold">{item.title}</h2>
              <p>${item.price}</p>
              <p className="text-sm text-gray-600">{item.category}</p>
              <p className="text-sm">{item.description?.slice(0,120)}</p>
              <Link href={`/items/${item.id}`}><a className="text-blue-600">View</a></Link>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}