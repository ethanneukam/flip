import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function AddressModal({ isOpen, onClose, onSave }: { isOpen: boolean, onClose: () => void, onSave: () => void }) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    full_name: '',
    address_line1: '',
    city: '',
    state: '',
    zip: ''
  });

  const handleSave = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    
    const { error } = await supabase
      .from('profiles')
      .update({ ...form, updated_at: new Date() })
      .eq('id', user?.id);

    if (error) alert(error.message);
    else {
      onSave();
      onClose();
    }
    setLoading(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-[#0A0A0A] border border-white/10 w-full max-w-md rounded-3xl p-6 shadow-2xl font-mono">
        <h2 className="text-white text-xl font-black italic uppercase mb-2 tracking-tighter">Shipping Details</h2>
        <p className="text-gray-500 text-[10px] uppercase mb-6 font-bold tracking-widest">Required for P2P Fulfillment</p>
        
        <div className="space-y-3">
          <input placeholder="FULL NAME" className="w-full bg-white/5 border border-white/10 p-3 rounded-xl text-white outline-none text-xs" 
            onChange={e => setForm({...form, full_name: e.target.value})} />
          <input placeholder="STREET ADDRESS" className="w-full bg-white/5 border border-white/10 p-3 rounded-xl text-white outline-none text-xs" 
            onChange={e => setForm({...form, address_line1: e.target.value})} />
          <div className="grid grid-cols-2 gap-2">
            <input placeholder="CITY" className="bg-white/5 border border-white/10 p-3 rounded-xl text-white outline-none text-xs" 
              onChange={e => setForm({...form, city: e.target.value})} />
            <div className="grid grid-cols-2 gap-2">
              <input placeholder="ST" className="bg-white/5 border border-white/10 p-3 rounded-xl text-white outline-none text-xs uppercase" maxLength={2} 
                onChange={e => setForm({...form, state: e.target.value})} />
              <input placeholder="ZIP" className="bg-white/5 border border-white/10 p-3 rounded-xl text-white outline-none text-xs" 
                onChange={e => setForm({...form, zip: e.target.value})} />
            </div>
          </div>
        </div>

        <button 
          onClick={handleSave}
          disabled={loading}
          className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black uppercase tracking-widest mt-8 hover:bg-blue-500 transition-all text-xs"
        >
          {loading ? 'SAVING...' : 'CONFIRM ADDRESS'}
        </button>
      </div>
    </div>
  );
}
