/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  Factory, 
  Plus, 
  Download, 
  Trash2, 
  Edit2, 
  PlusCircle, 
  User, 
  Camera,
  TrendingUp,
  Package,
  CreditCard,
  ArrowDownCircle,
  ArrowUpCircle,
  Search,
  Printer,
  FileText,
  Settings,
  X,
  Check,
  Upload,
  LayoutDashboard,
  History,
  ShieldCheck,
  LogOut,
  Save,
  RefreshCw,
  Inbox,
  Truck,
  Banknote,
  Bell,
  ClipboardList,
  CheckCircle2,
  Circle,
  Calendar
} from 'lucide-react';
import Papa from 'papaparse';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface Note {
  id: number;
  text: string;
  completed: boolean;
  timestamp: number;
}

interface Transaction {
  id: number;
  date: string;
  pkgType: 'Package' | 'Non-Package';
  challan: string;
  buyer: string;
  fabricName: string;
  type: 'receive' | 'delivery' | 'bill';
  receiveQty: number;
  orderQty: number;
  delvA: number;
  delvB: number;
  priceA: number;
  bill: number;
  paid: number;
}

interface Manager {
  name: string;
  photo: string | null;
}

interface FormData {
  date: string;
  pkgType: 'Package' | 'Non-Package';
  challan: string;
  buyer: string;
  fabricName: string;
  type: 'receive' | 'delivery' | 'bill';
  amount: string;
  orderQty: string;
  delvA: string;
  delvB: string;
  priceA: string;
  billEntry: string;
  paidEntry: string;
}

export default function App() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [manager, setManager] = useState<Manager>({ name: 'Manager Name', photo: null });
  const [buyerName, setBuyerName] = useState('Select a Buyer');
  const [filterBuyer, setFilterBuyer] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [selectedStatementBuyer, setSelectedStatementBuyer] = useState<string>('');
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState('Dashboard');
  const [tempManagerName, setTempManagerName] = useState(manager.name);
  const [isSaving, setIsSaving] = useState(false);
  const [notes, setNotes] = useState<Note[]>([]);
  const [newNote, setNewNote] = useState('');
  const [showNoteHistory, setShowNoteHistory] = useState(false);
  
  // Filter States
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'receive' | 'delivery' | 'bill'>('all');
  const [filterPkgType, setFilterPkgType] = useState<'all' | 'Package' | 'Non-Package'>('all');
  
  // Form State
  const [formData, setFormData] = useState<FormData>({
    date: new Date().toISOString().split('T')[0],
    pkgType: 'Non-Package',
    challan: '',
    buyer: '',
    fabricName: '',
    type: 'receive',
    amount: '',
    orderQty: '',
    delvA: '',
    delvB: '',
    priceA: '',
    billEntry: '',
    paidEntry: '',
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const csvInputRef = useRef<HTMLInputElement>(null);
  const paidInputRef = useRef<HTMLInputElement>(null);

  // Sync billEntry with calculateBilling in delivery mode
  useEffect(() => {
    if (formData.type === 'delivery') {
      const bill = calculateBilling();
      if (bill.toString() !== formData.billEntry) {
        setFormData(prev => ({ ...prev, billEntry: bill.toString() }));
      }
    }
  }, [formData.delvA, formData.delvB, formData.priceA, formData.type]);

  // Load data from server
  useEffect(() => {
    const loadData = async () => {
      try {
        const response = await fetch('/api/data');
        if (response.ok) {
          const data = await response.json();
          if (data.transactions) setTransactions(data.transactions);
          if (data.manager) setManager(data.manager);
          if (data.notes) setNotes(data.notes);
        }
      } catch (error) {
        console.error('Failed to load data:', error);
        // Fallback to localStorage if server fails
        const savedData = localStorage.getItem('inventory_billing_data');
        const savedManager = localStorage.getItem('inventory_billing_manager');
        const savedNotes = localStorage.getItem('inventory_billing_notes');
        if (savedData) setTransactions(JSON.parse(savedData));
        if (savedManager) setManager(JSON.parse(savedManager));
        if (savedNotes) setNotes(JSON.parse(savedNotes));
      }
    };
    loadData();
  }, []);

  // Save data to server
  const saveData = async (currentTransactions: Transaction[], currentManager: Manager, currentNotes?: Note[]) => {
    setIsSaving(true);
    try {
      await fetch('/api/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          transactions: currentTransactions, 
          manager: currentManager,
          notes: currentNotes || notes
        }),
      });
      // Also save to localStorage as backup
      localStorage.setItem('inventory_billing_data', JSON.stringify(currentTransactions));
      localStorage.setItem('inventory_billing_manager', JSON.stringify(currentManager));
      localStorage.setItem('inventory_billing_notes', JSON.stringify(currentNotes || notes));
    } catch (error) {
      console.error('Failed to save data:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const newManager = { ...manager, photo: reader.result as string };
        setManager(newManager);
        saveData(transactions, newManager);
      };
      reader.readAsDataURL(file);
    }
  };

  const saveProfile = () => {
    const newManager = { ...manager, name: tempManagerName };
    setManager(newManager);
    saveData(transactions, newManager);
    setIsProfileModalOpen(false);
  };

  const exportData = () => {
    const dataStr = JSON.stringify({ transactions, manager }, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `profabric_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const importData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const json = JSON.parse(event.target?.result as string);
          if (json.transactions && json.manager) {
            setTransactions(json.transactions);
            setManager(json.manager);
            saveData(json.transactions, json.manager);
            alert('Data imported successfully!');
          } else {
            alert('Invalid backup file format.');
          }
        } catch (err) {
          alert('Error parsing backup file.');
        }
      };
      reader.readAsText(file);
    }
  };

  const calculateBilling = () => {
    const delvA = parseFloat(formData.delvA) || 0;
    const delvB = parseFloat(formData.delvB) || 0;
    const priceA = parseFloat(formData.priceA) || 0;
    const priceB = priceA / 2;
    return Math.round((delvA * priceA) + (delvB * priceB));
  };

  const handleCSVImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: 'greedy', // Better at skipping lines with only whitespace
        complete: (results) => {
          const cleanNumber = (val: any) => {
            if (val === undefined || val === null || val === '') return 0;
            // Remove commas, currency symbols, and spaces
            const cleaned = String(val).replace(/[,৳$ ]/g, '');
            const num = parseFloat(cleaned);
            return isNaN(num) ? 0 : num;
          };

          const importedData: Transaction[] = results.data
            .filter((row: any) => row.Buyer || row.Date || row.Challan) // Filter out empty rows
            .map((row: any, index: number) => ({
              id: Date.now() + index + Math.random(),
              date: row.Date || new Date().toISOString().split('T')[0],
              pkgType: (String(row.Category || '').toLowerCase().includes('package') ? 'Package' : 'Non-Package') as any,
              challan: row.Challan || row.Ref || 'N/A',
              buyer: String(row.Buyer || 'Unknown').trim(),
              fabricName: String(row.Fabrics || row.Fabric || row.FabricName || 'N/A').trim(),
              type: (String(row.Type || 'receive').toLowerCase().trim()) as any,
              receiveQty: cleanNumber(row.RecvQty || row.Recv || row.ReceiveQty),
              orderQty: cleanNumber(row.OrderQty || row.Order || row.DeliveryQty),
              delvA: cleanNumber(row.DelvA),
              delvB: cleanNumber(row.DelvB),
              priceA: cleanNumber(row.PriceA),
              bill: cleanNumber(row.Bill),
              paid: cleanNumber(row.Paid),
            }));
          
          if (importedData.length > 0) {
            const newTransactions = [...importedData, ...transactions];
            setTransactions(newTransactions);
            saveData(newTransactions, manager);
            alert(`${importedData.length} entries imported successfully!`);
          } else {
            alert("No valid data found in the CSV file. Please check the headers and content.");
          }
        },
        error: (error) => {
          alert("Error parsing CSV: " + error.message);
        }
      });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const newEntry: Transaction = {
      id: editingId || Date.now(),
      date: formData.date,
      pkgType: formData.pkgType,
      challan: formData.challan || 'N/A',
      buyer: formData.buyer.trim(),
      fabricName: formData.fabricName.trim() || 'N/A',
      type: formData.type,
      receiveQty: formData.type === 'receive' ? parseFloat(formData.amount) || 0 : 0,
      orderQty: formData.type === 'delivery' ? parseFloat(formData.orderQty) || 0 : 0,
      delvA: formData.type === 'delivery' ? parseFloat(formData.delvA) || 0 : 0,
      delvB: formData.type === 'delivery' ? parseFloat(formData.delvB) || 0 : 0,
      priceA: formData.type === 'delivery' ? parseFloat(formData.priceA) || 0 : 0,
      bill: formData.type === 'delivery' ? calculateBilling() : (formData.type === 'bill' ? parseFloat(formData.billEntry) || 0 : 0),
      paid: (formData.type === 'bill' || formData.type === 'delivery') ? parseFloat(formData.paidEntry) || 0 : 0,
    };

    let newTransactions;
    if (editingId) {
      newTransactions = transactions.map(t => t.id === editingId ? newEntry : t);
      setEditingId(null);
    } else {
      newTransactions = [newEntry, ...transactions];
    }
    setTransactions(newTransactions);
    saveData(newTransactions, manager);

    // Reset form
    setFormData({
      date: new Date().toISOString().split('T')[0],
      pkgType: 'Non-Package' as const,
      challan: '',
      buyer: '',
      fabricName: '',
      type: 'receive' as const,
      amount: '',
      orderQty: '',
      delvA: '',
      delvB: '',
      priceA: '',
      billEntry: '',
      paidEntry: '',
    });
    
    if (newEntry.buyer) setBuyerName(newEntry.buyer);
  };

  const deleteEntry = (id: number) => {
    setDeleteConfirmId(id);
  };

  const confirmDelete = () => {
    if (deleteConfirmId !== null) {
      const newTransactions = transactions.filter(t => t.id !== deleteConfirmId);
      setTransactions(newTransactions);
      saveData(newTransactions, manager);
      setDeleteConfirmId(null);
    }
  };

  const editEntry = (t: Transaction) => {
    setEditingId(t.id);
    setFormData({
      date: t.date,
      pkgType: t.pkgType,
      challan: t.challan,
      buyer: t.buyer,
      fabricName: t.fabricName || '',
      type: t.type,
      amount: t.receiveQty.toString(),
      orderQty: t.orderQty.toString(),
      delvA: t.delvA.toString(),
      delvB: t.delvB.toString(),
      priceA: (t.priceA || 0).toString(),
      billEntry: t.bill.toString(),
      paidEntry: t.paid.toString(),
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const stats = {
    received: transactions.reduce((s, t) => s + (Number(t.receiveQty) || 0), 0),
    ordered: transactions.reduce((s, t) => s + (Number(t.orderQty) || 0), 0),
    bill: transactions.reduce((s, t) => s + (Number(t.bill) || 0), 0),
    paid: transactions.reduce((s, t) => s + (Number(t.paid) || 0), 0),
  };

  const chartData = [...transactions]
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(-10)
    .map(t => ({
      date: t.date,
      stock: transactions
        .filter(x => x.date <= t.date)
        .reduce((s, x) => s + (Number(x.receiveQty) || 0) - (Number(x.orderQty) || 0), 0)
    }));

  const filteredTransactions = transactions.filter(t => {
    const matchesSearch = (t.buyer || '').toLowerCase().includes(filterBuyer.toLowerCase()) ||
                         (t.challan || '').toLowerCase().includes(filterBuyer.toLowerCase());
    const matchesStartDate = !filterStartDate || t.date >= filterStartDate;
    const matchesEndDate = !filterEndDate || t.date <= filterEndDate;
    const matchesType = filterType === 'all' || t.type === filterType;
    const matchesPkgType = filterPkgType === 'all' || t.pkgType === filterPkgType;

    return matchesSearch && matchesStartDate && matchesEndDate && matchesType && matchesPkgType;
  });

  const buyerDues = transactions.reduce((acc, t) => {
    const bill = Number(t.bill) || 0;
    const paid = Number(t.paid) || 0;
    const due = bill - paid;
    if (due > 0) {
      acc[t.buyer] = (acc[t.buyer] || 0) + due;
    }
    return acc;
  }, {} as Record<string, number>);

  const sortedTransactions = [...filteredTransactions].sort((a, b) => {
    const aDue = a.bill - a.paid;
    const bDue = b.bill - b.paid;
    if (aDue > 0 && bDue <= 0) return -1;
    if (aDue <= 0 && bDue > 0) return 1;
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  });

  const uniqueBuyers = Array.from(new Set(transactions.map(t => t.buyer))).sort();
  const uniqueFabrics = Array.from(new Set(transactions.map(t => t.fabricName).filter(Boolean))).sort();

  const getBuyerStatementData = (buyer: string) => {
    const buyerTransactions = transactions.filter(t => t.buyer === buyer).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const summary = buyerTransactions.reduce((acc, t) => ({
      received: acc.received + t.receiveQty,
      ordered: acc.ordered + t.orderQty,
      bill: acc.bill + t.bill,
      paid: acc.paid + t.paid,
    }), { received: 0, ordered: 0, bill: 0, paid: 0 });
    
    return { transactions: buyerTransactions, summary };
  };

  const handlePrint = () => {
    window.print();
  };

  const exportBuyerCSV = (buyer: string) => {
    const { transactions: buyerTransactions } = getBuyerStatementData(buyer);
    const csv = "Date,Type,Challan,Recv,Order,Bill,Paid\n" + 
      buyerTransactions.map(t => `${t.date},${t.type},${t.challan},${t.receiveQty},${t.orderQty},${t.bill},${t.paid}`).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${buyer}_statement.csv`;
    a.click();
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-[#020617] text-slate-200 selection:bg-indigo-500/30">
      <input 
        type="file" 
        ref={fileInputRef} 
        className="hidden" 
        accept="image/*" 
        onChange={handlePhotoUpload} 
      />
      <input 
        type="file" 
        ref={csvInputRef} 
        className="hidden" 
        accept=".csv" 
        onChange={handleCSVImport} 
      />
      {/* Sidebar */}
      <aside className="w-full lg:w-72 bg-[#0f172a]/40 backdrop-blur-3xl border-r border-white/5 p-6 flex flex-col gap-8 print:hidden">
        <div className="flex items-center gap-3 px-2">
          <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-2.5 rounded-2xl shadow-lg shadow-indigo-500/20">
            <Factory className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-black tracking-tight text-white leading-none">PROFABRIC</h1>
            <p className="text-[10px] font-bold text-indigo-400 tracking-[0.2em] mt-1">ELITE LEDGER</p>
          </div>
        </div>

        {/* Manager Profile */}
        <div className="relative group">
          <div className="glass-card p-5 rounded-[2rem] border-white/5 bg-gradient-to-b from-white/[0.03] to-transparent flex flex-col items-center gap-4 transition-all duration-500 group-hover:border-white/10">
            <div className="relative">
              <div className="w-20 h-20 rounded-full bg-slate-800 ring-2 ring-indigo-500/20 ring-offset-4 ring-offset-[#0f172a] overflow-hidden">
                {manager.photo ? (
                  <img src={manager.photo} alt="Manager" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-slate-900">
                    <User className="w-8 h-8 text-slate-600" />
                  </div>
                )}
              </div>
              <div className="absolute -bottom-1 -right-1 bg-emerald-500 w-4 h-4 rounded-full border-4 border-[#0f172a]" />
            </div>
            
            <div className="text-center">
              <h3 className="font-bold text-white tracking-tight">{manager.name}</h3>
              <div className="flex items-center justify-center gap-1.5 mt-1">
                <ShieldCheck className="w-3 h-3 text-indigo-400" />
                <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Verified Manager</span>
              </div>
            </div>

            <button 
              onClick={() => {
                setTempManagerName(manager.name);
                setIsProfileModalOpen(true);
              }}
              className="mt-2 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white text-xs font-bold transition-all border border-white/5"
            >
              <Settings className="w-3.5 h-3.5" />
              Manage Profile
            </button>
          </div>
        </div>

        <nav className="flex-1 space-y-6">
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-4 px-4">Navigation</p>
            <div className="space-y-1">
              <NavItem 
                icon={<LayoutDashboard className="w-4 h-4" />} 
                label="Dashboard" 
                active={activeTab === 'Dashboard'} 
                onClick={() => {
                  setActiveTab('Dashboard');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              />
              <NavItem 
                icon={<History className="w-4 h-4" />} 
                label="History" 
                active={activeTab === 'History'}
                onClick={() => {
                  setActiveTab('History');
                  document.getElementById('ledger-section')?.scrollIntoView({ behavior: 'smooth' });
                }}
              />
              <NavItem 
                icon={<CreditCard className="w-4 h-4" />} 
                label="Payments" 
                active={activeTab === 'Payments'}
                onClick={() => {
                  setActiveTab('Payments');
                  document.getElementById('dues-section')?.scrollIntoView({ behavior: 'smooth' });
                }}
              />
            </div>
          </div>

          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-4 px-4">System Actions</p>
            <div className="space-y-2">
              <button 
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl bg-indigo-600 text-white font-bold hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-600/20 group"
              >
                <PlusCircle className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" />
                New Entry
              </button>
              <button 
                onClick={() => csvInputRef.current?.click()}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl bg-slate-800 text-slate-300 font-bold hover:bg-slate-700 transition-all border border-white/5"
              >
                <Upload className="w-4 h-4" />
                Import CSV
              </button>
              <button 
                onClick={() => saveData(transactions, manager)}
                disabled={isSaving}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl bg-emerald-600/20 text-emerald-400 font-bold hover:bg-emerald-600/30 transition-all border border-emerald-500/20"
              >
                {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {isSaving ? 'Saving...' : 'Save to File'}
              </button>
            </div>
          </div>

          {/* Notes Section */}
          <div className="pt-4 border-t border-white/5">
            <div className="flex items-center justify-between px-4 mb-4">
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Buyer Notes</p>
              <button 
                onClick={() => setShowNoteHistory(!showNoteHistory)}
                className="text-[10px] font-bold text-indigo-400 hover:text-indigo-300 transition-colors flex items-center gap-1"
              >
                <History className="w-3 h-3" />
                {showNoteHistory ? 'Active' : 'History'}
              </button>
            </div>
            
            {!showNoteHistory && notes.filter(n => !n.completed).length < 5 && (
              <div className="px-4 mb-4">
                <div className="relative">
                  <input 
                    type="text" 
                    placeholder="Add reminder..." 
                    value={newNote}
                    onChange={e => setNewNote(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && newNote.trim()) {
                        const note: Note = {
                          id: Date.now(),
                          text: newNote.trim(),
                          completed: false,
                          timestamp: Date.now()
                        };
                        const updatedNotes = [note, ...notes];
                        setNotes(updatedNotes);
                        setNewNote('');
                        saveData(transactions, manager, updatedNotes);
                      }
                    }}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-600 focus:ring-1 focus:ring-indigo-500 outline-none transition-all"
                  />
                  <PlusCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-600" />
                </div>
              </div>
            )}

            <div className="space-y-1 px-2">
              {(showNoteHistory ? notes.filter(n => n.completed) : notes.filter(n => !n.completed)).slice(0, 10).map(note => (
                <div 
                  key={note.id} 
                  className={cn(
                    "group flex items-center gap-3 px-3 py-2 rounded-xl transition-all",
                    note.completed ? "opacity-50" : "hover:bg-white/5"
                  )}
                >
                  <button 
                    onClick={() => {
                      const updatedNotes = notes.map(n => n.id === note.id ? { ...n, completed: !n.completed } : n);
                      setNotes(updatedNotes);
                      saveData(transactions, manager, updatedNotes);
                    }}
                    className={cn(
                      "w-4 h-4 rounded-full border flex items-center justify-center transition-all",
                      note.completed ? "bg-emerald-500 border-emerald-500" : "border-slate-600 group-hover:border-indigo-500"
                    )}
                  >
                    {note.completed && <CheckCircle2 className="w-2.5 h-2.5 text-white" />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className={cn("text-xs truncate", note.completed ? "text-slate-500 line-through" : "text-slate-300")}>
                      {note.text}
                    </p>
                    <p className="text-[9px] text-slate-600 mt-0.5">
                      {new Date(note.timestamp).toLocaleDateString()}
                    </p>
                  </div>
                  {!note.completed && (
                    <button 
                      onClick={() => {
                        const updatedNotes = notes.filter(n => n.id !== note.id);
                        setNotes(updatedNotes);
                        saveData(transactions, manager, updatedNotes);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 text-slate-600 hover:text-rose-400 transition-all"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              ))}
              {(!showNoteHistory && notes.filter(n => !n.completed).length === 0) && (
                <div className="px-4 py-8 text-center">
                  <ClipboardList className="w-8 h-8 text-slate-800 mx-auto mb-2" />
                  <p className="text-[10px] font-bold text-slate-600 uppercase">No active notes</p>
                </div>
              )}
            </div>
          </div>
        </nav>

        <div className="pt-6 border-t border-white/5">
          <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-500 hover:text-rose-400 hover:bg-rose-400/5 transition-all font-bold text-sm">
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6 lg:p-10 overflow-y-auto max-h-screen custom-scrollbar bg-gradient-to-br from-[#020617] via-[#020617] to-indigo-950/20">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-10 print:hidden">
          <div>
            <h2 className="text-3xl font-black tracking-tighter text-white bg-clip-text text-transparent bg-gradient-to-r from-white via-white to-indigo-400">Operations Command Center</h2>
            <p className="text-slate-500 text-xs font-bold uppercase tracking-[0.2em] mt-1.5 flex items-center gap-2">
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-500" />
              Elite Dashboard • {manager.name}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="glass-card px-4 py-2 rounded-xl flex items-center gap-3 border-white/5">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-bold text-slate-400">{new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
            </div>
            <button 
              onClick={() => {
                const csv = "Date,Buyer,Type,Challan,Recv,Order,Bill,Paid\n" + 
                  transactions.map(t => `${t.date},${t.buyer},${t.type},${t.challan},${t.receiveQty},${t.orderQty},${t.bill},${t.paid}`).join('\n');
                const blob = new Blob([csv], { type: 'text/csv' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'ledger_report.csv';
                a.click();
              }}
              className="bg-slate-800 hover:bg-slate-700 text-white p-2.5 rounded-xl border border-white/5 transition-all"
              title="Export Full Ledger"
            >
              <Download className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6 mb-10 print:hidden">
          <StatCard label="Total Received" value={`${stats.received.toLocaleString()}`} unit="Yds" icon={<ArrowDownCircle className="w-5 h-5" />} color="blue" />
          <StatCard label="Total Ordered" value={`${stats.ordered.toLocaleString()}`} unit="Yds" icon={<ArrowUpCircle className="w-5 h-5" />} color="rose" />
          <StatCard label="Current Stock" value={`${(stats.received - stats.ordered).toLocaleString()}`} unit="Yds" icon={<Package className="w-5 h-5" />} color="emerald" />
          <StatCard label="Total Due" value={`${(stats.bill - stats.paid).toLocaleString()}`} unit="৳" icon={<CreditCard className="w-5 h-5" />} color="amber" />
        </div>

        {/* Due Summary Section */}
        {Object.keys(buyerDues).length > 0 && (
          <div id="dues-section" className="mb-8 print:hidden scroll-mt-10">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-rose-500" />
              Outstanding Dues Summary
            </h3>
            <div className="flex flex-wrap gap-3">
              {Object.entries(buyerDues).map(([buyer, due]) => (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  key={buyer} 
                  className="glass-card px-4 py-3 rounded-2xl border-l-4 border-l-rose-500 flex flex-col cursor-pointer hover:bg-slate-800 transition-colors"
                  onClick={() => setSelectedStatementBuyer(buyer)}
                >
                  <span className="text-[10px] font-bold text-slate-500 uppercase">{buyer}</span>
                  <span className="text-sm font-black text-rose-400">৳ {due.toLocaleString()}</span>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Buyer Statement Selector */}
        <div className="mb-8 print:hidden">
          <div className="glass-card p-6 rounded-3xl flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="bg-emerald-600/20 p-2 rounded-xl">
                <FileText className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold">Buyer Statement</h3>
                <p className="text-xs text-slate-500">View and export detailed history for a specific buyer</p>
              </div>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <select 
                value={selectedStatementBuyer}
                onChange={(e) => setSelectedStatementBuyer(e.target.value)}
                className="bg-slate-800 border-none rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 w-full sm:w-64"
              >
                <option value="">Select a Buyer</option>
                {uniqueBuyers.map(buyer => (
                  <option key={buyer} value={buyer}>{buyer}</option>
                ))}
              </select>
              {selectedStatementBuyer && (
                <button onClick={() => setSelectedStatementBuyer('')} className="text-xs text-slate-500 hover:text-white transition-colors px-2">Clear</button>
              )}
            </div>
          </div>
        </div>

        {/* Selected Buyer Statement View */}
        <AnimatePresence>
          {selectedStatementBuyer && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="mb-8 space-y-6">
              <div className="glass-card p-8 rounded-3xl relative overflow-hidden print:bg-white print:text-black print:border-none print:shadow-none">
                <div className="hidden print:block mb-8 border-b-2 border-slate-200 pb-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <h1 className="text-3xl font-black uppercase tracking-tighter">inventory & Billing soft</h1>
                      <p className="text-sm text-slate-600">Generated on: {new Date().toLocaleDateString()}</p>
                    </div>
                    <div className="text-right">
                      <h2 className="text-xl font-bold">{manager.name}</h2>
                      <p className="text-xs text-slate-500">System Manager</p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 print:mb-6">
                  <div>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1 print:text-slate-600">Statement For</p>
                    <h2 className="text-4xl font-black tracking-tighter print:text-black">{selectedStatementBuyer}</h2>
                  </div>
                  <div className="flex gap-2 print:hidden">
                    <button onClick={() => exportBuyerCSV(selectedStatementBuyer)} className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all border border-white/5">
                      <Download className="w-4 h-4" /> Export CSV
                    </button>
                    <button onClick={handlePrint} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-lg shadow-indigo-600/20">
                      <Printer className="w-4 h-4" /> Print Statement
                    </button>
                  </div>
                </div>

                {(() => {
                  const { summary } = getBuyerStatementData(selectedStatementBuyer);
                  return (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8 print:grid-cols-4 print:gap-2">
                      <div className="bg-slate-800/50 p-4 rounded-2xl print:bg-slate-100 print:border print:border-slate-200">
                        <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1">Received</p>
                        <p className="text-xl font-black print:text-black">{summary.received.toLocaleString()} Yds</p>
                      </div>
                      <div className="bg-slate-800/50 p-4 rounded-2xl print:bg-slate-100 print:border print:border-slate-200">
                        <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1">Delivered</p>
                        <p className="text-xl font-black print:text-black">{summary.ordered.toLocaleString()} Yds</p>
                      </div>
                      <div className="bg-slate-800/50 p-4 rounded-2xl print:bg-slate-100 print:border print:border-slate-200">
                        <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1">Total Bill</p>
                        <p className="text-xl font-black print:text-black">৳ {summary.bill.toLocaleString()}</p>
                      </div>
                      <div className="bg-slate-800/50 p-4 rounded-2xl print:bg-slate-100 print:border print:border-slate-200">
                        <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1">Balance Due</p>
                        <p className={cn("text-xl font-black", summary.bill - summary.paid > 0 ? "text-rose-400 print:text-rose-600" : "text-emerald-400 print:text-emerald-600")}>
                          ৳ {(summary.bill - summary.paid).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  );
                })()}

                <div className="overflow-x-auto print:overflow-visible">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-800/30 text-[11px] font-bold text-slate-400 uppercase tracking-widest print:bg-slate-100 print:text-slate-600">
                        <th className="px-4 py-3">Date</th>
                        <th className="px-4 py-3">Type</th>
                        <th className="px-4 py-3">Fabric / Category</th>
                        <th className="px-4 py-3">Ref</th>
                        <th className="px-4 py-3 text-right">Recv</th>
                        <th className="px-4 py-3 text-right">Order</th>
                        <th className="px-4 py-3 text-right">Bill</th>
                        <th className="px-4 py-3 text-right">Paid</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 print:divide-slate-200">
                      {getBuyerStatementData(selectedStatementBuyer).transactions.map(t => (
                        <tr key={t.id} className="text-xs print:text-black">
                          <td className="px-4 py-3 font-mono">{t.date}</td>
                          <td className="px-4 py-3 capitalize">{t.type}</td>
                          <td className="px-4 py-3">
                            <div className="flex flex-col">
                              <span className="font-bold text-emerald-400 print:text-emerald-700">{t.fabricName}</span>
                              <span className="text-[9px] text-slate-500 uppercase">{t.pkgType}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-slate-400 print:text-slate-600">{t.challan}</td>
                          <td className="px-4 py-3 text-right text-blue-400 print:text-blue-600">{t.receiveQty > 0 ? t.receiveQty : '-'}</td>
                          <td className="px-4 py-3 text-right text-rose-400 print:text-rose-600">{t.orderQty > 0 ? t.orderQty : '-'}</td>
                          <td className="px-4 py-3 text-right font-bold">৳ {t.bill > 0 ? t.bill.toLocaleString() : '-'}</td>
                          <td className="px-4 py-3 text-right text-emerald-400 print:text-emerald-600">৳ {t.paid > 0 ? t.paid.toLocaleString() : '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 mb-8 print:hidden">
          <div className="xl:col-span-5 glass-card p-6 rounded-3xl">
            <h3 className="text-lg font-bold mb-6 flex items-center gap-2"><PlusCircle className="w-5 h-5 text-indigo-500" /> {editingId ? 'Edit Entry' : 'New Transaction'}</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Date</label>
                  <input type="date" value={formData.date} onChange={e => setFormData(prev => ({ ...prev, date: e.target.value }))} className="w-full bg-slate-800 border-none rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Category</label>
                  <select value={formData.pkgType} onChange={e => setFormData(prev => ({ ...prev, pkgType: e.target.value as any }))} className="w-full bg-slate-800 border-none rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500">
                    <option value="Non-Package">Non-Package</option>
                    <option value="Package">Package</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Buyer Name</label>
                    {formData.buyer && buyerDues[formData.buyer] !== undefined && <span className="text-[9px] font-bold text-rose-400 animate-pulse">Due: ৳ {buyerDues[formData.buyer].toLocaleString()}</span>}
                  </div>
                  <input type="text" required list="buyer-suggestions" placeholder="Enter Name" value={formData.buyer} onChange={e => setFormData(prev => ({ ...prev, buyer: e.target.value }))} className="w-full bg-slate-800 border-none rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500" />
                  <datalist id="buyer-suggestions">{uniqueBuyers.map(buyer => <option key={buyer} value={buyer} />)}</datalist>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Fabric Name</label>
                  <input type="text" list="fabric-suggestions" placeholder="e.g. Cotton" value={formData.fabricName} onChange={e => setFormData(prev => ({ ...prev, fabricName: e.target.value }))} className="w-full bg-slate-800 border-none rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500" />
                  <datalist id="fabric-suggestions">{uniqueFabrics.map(fabric => <option key={fabric} value={fabric} />)}</datalist>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Challan / Ref</label>
                <input type="text" placeholder="Ref No" value={formData.challan} onChange={e => setFormData(prev => ({ ...prev, challan: e.target.value }))} className="w-full bg-slate-800 border-none rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Entry Type</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['receive', 'delivery', 'bill'] as const).map(type => {
                    const Icon = type === 'receive' ? Inbox : type === 'delivery' ? Truck : Banknote;
                    const activeColor = type === 'receive' ? "bg-blue-600 border-blue-500" : type === 'delivery' ? "bg-indigo-600 border-indigo-500" : "bg-emerald-600 border-emerald-500";
                    return (
                      <button 
                        key={type} 
                        type="button" 
                        onClick={() => setFormData(prev => ({ ...prev, type }))} 
                        className={cn(
                          "py-2.5 rounded-xl text-[10px] font-bold capitalize transition-all border flex flex-col items-center gap-1", 
                          formData.type === type ? `${activeColor} text-white shadow-lg` : "bg-slate-800 border-transparent text-slate-400 hover:bg-slate-700"
                        )}
                      >
                        <Icon className="w-4 h-4" />
                        {type === 'receive' ? 'Grey Recv' : type}
                      </button>
                    );
                  })}
                </div>
              </div>
              <AnimatePresence mode="wait">
                {formData.type === 'receive' && (
                  <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="space-y-4 p-4 bg-blue-600/5 rounded-2xl border border-blue-500/20">
                    <div className="flex items-center gap-2 text-blue-400 mb-2">
                      <Inbox className="w-4 h-4" />
                      <span className="text-xs font-bold uppercase tracking-wider">Grey Fabric Receive</span>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Quantity Received (Yds)</label>
                      <input type="number" placeholder="0.00" value={formData.amount} onChange={e => setFormData(prev => ({ ...prev, amount: e.target.value }))} className="w-full bg-slate-900 border-none rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 font-mono" />
                    </div>
                  </motion.div>
                )}
                {formData.type === 'delivery' && (
                  <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="space-y-4 p-4 bg-indigo-600/5 rounded-2xl border border-indigo-500/20">
                    <div className="flex items-center justify-between text-indigo-400 mb-2">
                      <div className="flex items-center gap-2">
                        <Truck className="w-4 h-4" />
                        <span className="text-xs font-bold uppercase tracking-wider">Fabric Delivery & Billing</span>
                      </div>
                      {(parseFloat(formData.delvA) || 0) + (parseFloat(formData.delvB) || 0) !== (parseFloat(formData.orderQty) || 0) && (parseFloat(formData.orderQty) > 0) && (
                        <span className="text-[9px] bg-amber-500/10 text-amber-500 px-2 py-0.5 rounded-full border border-amber-500/20">Qty Mismatch</span>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-indigo-400 uppercase tracking-wide">Order Quantity (Stock Minus)</label>
                      <input type="number" placeholder="0.00" value={formData.orderQty} onChange={e => setFormData(prev => ({ ...prev, orderQty: e.target.value }))} className="w-full bg-slate-900 border-none rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 font-mono" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">A Grade Delv.</label>
                        <input type="number" placeholder="0" value={formData.delvA} onChange={e => setFormData(prev => ({ ...prev, delvA: e.target.value }))} className="w-full bg-slate-900 border-none rounded-xl px-4 py-2 text-sm font-mono" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">B Grade Delv.</label>
                        <input type="number" placeholder="0" value={formData.delvB} onChange={e => setFormData(prev => ({ ...prev, delvB: e.target.value }))} className="w-full bg-slate-900 border-none rounded-xl px-4 py-2 text-sm font-mono" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Price A (৳)</label>
                        <input 
                          type="number" 
                          placeholder="0.00"
                          value={formData.priceA} 
                          onChange={e => setFormData(prev => ({ ...prev, priceA: e.target.value }))} 
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              paidInputRef.current?.focus();
                            }
                          }}
                          className="w-full bg-slate-900 border-none rounded-xl px-4 py-2 text-sm font-mono" 
                        />
                      </div>
                      <div className="space-y-1.5">
                        <div className="flex justify-between items-center">
                          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Total Bill</label>
                          <span className="text-[8px] text-slate-500 uppercase font-bold italic">B-Grade = 50% Price</span>
                        </div>
                        <div className="w-full bg-slate-900 rounded-xl px-4 py-2 text-sm font-bold text-indigo-400 border border-indigo-500/30 shadow-inner shadow-indigo-500/10">৳ {calculateBilling().toLocaleString()}</div>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center">
                        <label className="text-[11px] font-bold text-emerald-400 uppercase tracking-wide">Receive Bill (৳)</label>
                        <span className="text-[9px] text-slate-500 uppercase">Balance: ৳ {(calculateBilling() - (parseFloat(formData.paidEntry) || 0)).toLocaleString()}</span>
                      </div>
                      <input 
                        type="number" 
                        ref={paidInputRef}
                        placeholder="0.00"
                        value={formData.paidEntry} 
                        onChange={e => setFormData(prev => ({ ...prev, paidEntry: e.target.value }))} 
                        className="w-full bg-slate-900 border-none rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500 font-bold text-emerald-400 font-mono" 
                      />
                    </div>
                  </motion.div>
                )}
                {formData.type === 'bill' && (
                  <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="space-y-4 p-4 bg-emerald-600/5 rounded-2xl border border-emerald-500/20">
                    <div className="flex items-center gap-2 text-emerald-400 mb-2">
                      <Banknote className="w-4 h-4" />
                      <span className="text-xs font-bold uppercase tracking-wider">Financial Transaction (Bill/Payment)</span>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Total Bill (৳)</label>
                        <input type="number" placeholder="0.00" value={formData.billEntry} onChange={e => setFormData(prev => ({ ...prev, billEntry: e.target.value }))} className="w-full bg-slate-900 border-none rounded-xl px-4 py-2.5 text-sm font-mono" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Received (৳)</label>
                        <input type="number" placeholder="0.00" value={formData.paidEntry} onChange={e => setFormData(prev => ({ ...prev, paidEntry: e.target.value }))} className="w-full bg-slate-900 border-none rounded-xl px-4 py-2.5 text-sm font-mono" />
                      </div>
                    </div>
                    <div className="p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20 flex justify-between items-center">
                      <span className="text-[11px] font-bold text-emerald-500 uppercase tracking-wide">Remaining Balance</span>
                      <span className="text-sm font-bold text-emerald-400">৳ {((parseFloat(formData.billEntry) || 0) - (parseFloat(formData.paidEntry) || 0)).toLocaleString()}</span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Financial Summary Preview */}
              {(parseFloat(formData.amount) > 0 || parseFloat(formData.orderQty) > 0 || parseFloat(formData.billEntry) > 0 || parseFloat(formData.paidEntry) > 0) && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-4 bg-slate-800/50 rounded-2xl border border-slate-700/50 space-y-2">
                  <div className="flex justify-between items-center text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <span>Transaction Summary</span>
                    <span className="text-indigo-400">Preview</span>
                  </div>
                  <div className="space-y-1">
                    {formData.type === 'receive' && parseFloat(formData.amount) > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-400">Grey Fabric In:</span>
                        <span className="font-bold text-blue-400">{formData.amount} Yds</span>
                      </div>
                    )}
                    {formData.type === 'delivery' && (
                      <>
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-400">Fabric Out:</span>
                          <span className="font-bold text-indigo-400">{formData.orderQty} Yds</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-400">Total Bill:</span>
                          <span className="font-bold text-slate-200">৳ {calculateBilling().toLocaleString()}</span>
                        </div>
                        {parseFloat(formData.paidEntry) > 0 && (
                          <div className="flex justify-between text-sm">
                            <span className="text-emerald-500">Payment Recv:</span>
                            <span className="font-bold text-emerald-400">৳ {parseFloat(formData.paidEntry).toLocaleString()}</span>
                          </div>
                        )}
                      </>
                    )}
                    {formData.type === 'bill' && (
                      <>
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-400">Bill Amount:</span>
                          <span className="font-bold text-slate-200">৳ {(parseFloat(formData.billEntry) || 0).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-emerald-500">Payment Recv:</span>
                          <span className="font-bold text-emerald-400">৳ {(parseFloat(formData.paidEntry) || 0).toLocaleString()}</span>
                        </div>
                      </>
                    )}
                  </div>
                </motion.div>
              )}

              <div className="flex gap-2 pt-2">
                <button type="submit" className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white py-3 rounded-2xl font-bold transition-all shadow-lg shadow-indigo-600/20">{editingId ? 'Update Entry' : 'Save Transaction'}</button>
                {editingId && <button type="button" onClick={() => { setEditingId(null); setFormData({ date: new Date().toISOString().split('T')[0], pkgType: 'Non-Package' as const, challan: '', buyer: '', fabricName: '', type: 'receive' as const, amount: '', orderQty: '', delvA: '', delvB: '', priceA: '', billEntry: '', paidEntry: '', }); }} className="px-6 bg-slate-800 hover:bg-slate-700 text-white rounded-2xl font-bold transition-all">Cancel</button>}
              </div>
            </form>
          </div>

          <div className="xl:col-span-7 glass-card p-6 rounded-3xl">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-lg font-bold flex items-center gap-2"><TrendingUp className="w-5 h-5 text-indigo-500" /> Inventory Trend</h3>
              <div className="flex gap-2"><div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-indigo-500" /><span className="text-[10px] font-bold text-slate-500 uppercase">Stock Level</span></div></div>
            </div>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs><linearGradient id="colorStock" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/><stop offset="95%" stopColor="#6366f1" stopOpacity={0}/></linearGradient></defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="date" stroke="#475569" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(val) => val.split('-').slice(1).join('/')} />
                  <YAxis stroke="#475569" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(val) => `${val}y`} />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px' }} itemStyle={{ color: '#6366f1', fontSize: '12px' }} />
                  <Area type="monotone" dataKey="stock" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorStock)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div id="ledger-section" className="glass-card rounded-3xl overflow-hidden print:hidden scroll-mt-10">
          <div className="p-6 border-b border-white/5 flex flex-col gap-6">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-6">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-indigo-500/10 rounded-xl border border-indigo-500/20">
                  <FileText className="w-5 h-5 text-indigo-400" />
                </div>
                <div>
                  <h3 className="text-xl font-black tracking-tight text-white">Transaction Ledger</h3>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.1em] mt-0.5">Detailed Operations History</p>
                </div>
              </div>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input type="text" placeholder="Search Buyer / Ref..." value={filterBuyer} onChange={e => setFilterBuyer(e.target.value)} className="w-full bg-slate-800 border-none rounded-xl pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500" />
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Start Date</label>
                <input type="date" value={filterStartDate} onChange={e => setFilterStartDate(e.target.value)} className="w-full bg-slate-800/50 border-none rounded-xl px-4 py-2 text-xs focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">End Date</label>
                <input type="date" value={filterEndDate} onChange={e => setFilterEndDate(e.target.value)} className="w-full bg-slate-800/50 border-none rounded-xl px-4 py-2 text-xs focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Trans. Type</label>
                <select value={filterType} onChange={e => setFilterType(e.target.value as any)} className="w-full bg-slate-800/50 border-none rounded-xl px-4 py-2 text-xs focus:ring-2 focus:ring-indigo-500">
                  <option value="all">All Types</option>
                  <option value="receive">Receive</option>
                  <option value="delivery">Delivery</option>
                  <option value="bill">Bill</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Pkg. Type</label>
                <select value={filterPkgType} onChange={e => setFilterPkgType(e.target.value as any)} className="w-full bg-slate-800/50 border-none rounded-xl px-4 py-2 text-xs focus:ring-2 focus:ring-indigo-500">
                  <option value="all">All Packages</option>
                  <option value="Package">Package</option>
                  <option value="Non-Package">Non-Package</option>
                </select>
              </div>
            </div>
          </div>
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-800/50 text-[11px] font-bold text-slate-400 uppercase tracking-[0.15em] border-y border-white/5">
                  <th className="px-6 py-5">Date</th>
                  <th className="px-6 py-5">Buyer / Ref</th>
                  <th className="px-6 py-5 text-center">Quantity Details</th>
                  <th className="px-6 py-5">Financials</th>
                  <th className="px-6 py-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {sortedTransactions.map(t => {
                  const due = t.bill - t.paid;
                  return (
                    <tr key={t.id} className={cn("group hover:bg-white/[0.03] transition-all duration-300 border-b border-white/5 last:border-0", due > 0 && "bg-rose-500/[0.02]")}>
                      <td className="px-6 py-5">
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-white tracking-tight group-hover:text-indigo-400 transition-colors">{new Date(t.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">{t.pkgType}</span>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex flex-col">
                          <span className="text-sm font-black text-slate-200 tracking-tight">{t.buyer}</span>
                          <div className="flex items-center gap-2 mt-1.5">
                            <span className="text-[10px] px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-400 font-bold border border-indigo-500/20">Ref: {t.challan}</span>
                            <span className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20">{t.fabricName}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        {t.type === 'receive' && <span className="text-blue-400 font-bold">+{t.receiveQty} Yds</span>}
                        {t.type === 'delivery' && <div className="flex flex-col items-center"><span className="text-rose-400 font-bold">-{t.orderQty} Yds</span><span className="text-[9px] text-slate-500">Delv: {t.delvA + t.delvB}</span></div>}
                        {t.type === 'bill' && <span className="text-slate-600">—</span>}
                      </td>
                      <td className="px-6 py-4">
                        {t.bill > 0 && <div className="text-indigo-300 font-bold text-xs">Bill: ৳ {t.bill.toLocaleString()}</div>}
                        {t.paid > 0 && <div className="text-emerald-500 font-bold text-xs">Paid: ৳ {t.paid.toLocaleString()}</div>}
                        {due > 0 && <div className="text-rose-500 font-bold text-xs mt-1">Due: ৳ {due.toLocaleString()}</div>}
                        {t.bill === 0 && t.paid === 0 && <span className="text-slate-600">—</span>}
                      </td>
                      <td className="px-6 py-4 text-right"><div className="flex justify-end gap-2"><button onClick={() => editEntry(t)} className="p-2 hover:bg-white/5 rounded-lg text-slate-400 hover:text-indigo-400 transition-all"><Edit2 className="w-4 h-4" /></button><button onClick={() => deleteEntry(t.id)} className="p-2 hover:bg-white/5 rounded-lg text-slate-400 hover:text-rose-400 transition-all"><Trash2 className="w-4 h-4" /></button></div></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <footer className="mt-20 py-12 border-t border-white/5 text-center print:hidden">
          <div className="flex flex-col items-center gap-6">
            <div className="flex items-center gap-3"><div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-2 rounded-xl shadow-lg shadow-indigo-500/20"><Factory className="w-5 h-5 text-white" /></div><div className="text-left"><h4 className="text-sm font-black tracking-tight text-white leading-none">PROFABRIC</h4><p className="text-[8px] font-bold text-indigo-400 tracking-[0.2em] mt-1">ELITE LEDGER SYSTEMS</p></div></div>
            <p className="text-xs text-slate-500 max-w-md px-6 leading-relaxed">The world-standard solution for textile inventory management and professional billing. Designed for precision, speed, and high-performance business tracking.</p>
            <div className="flex flex-wrap justify-center gap-x-8 gap-y-4"><a href="#" className="text-[10px] font-bold text-slate-500 hover:text-indigo-400 uppercase tracking-widest transition-all">Privacy Policy</a><a href="#" className="text-[10px] font-bold text-slate-500 hover:text-indigo-400 uppercase tracking-widest transition-all">Terms of Service</a><a href="#" className="text-[10px] font-bold text-slate-500 hover:text-indigo-400 uppercase tracking-widest transition-all">Help Center</a><a href="#" className="text-[10px] font-bold text-slate-500 hover:text-indigo-400 uppercase tracking-widest transition-all">API Docs</a></div>
            <div className="w-12 h-1 bg-gradient-to-r from-transparent via-indigo-500/20 to-transparent rounded-full" /><p className="text-[10px] text-slate-600 font-medium">© {new Date().getFullYear()} Profabric Elite. All rights reserved. Built for Excellence.</p>
          </div>
        </footer>
      </main>

      {/* Modals */}
      <AnimatePresence>
        {isProfileModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsProfileModalOpen(false)} className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} className="relative w-full max-w-md glass-card p-8 rounded-[2.5rem] border-white/10 shadow-2xl bg-[#0f172a]">
              <div className="flex justify-between items-center mb-8"><h3 className="text-xl font-black tracking-tight text-white">Edit Profile</h3><button onClick={() => setIsProfileModalOpen(false)} className="p-2 hover:bg-white/5 rounded-full text-slate-500 hover:text-white transition-all"><X className="w-5 h-5" /></button></div>
              <div className="flex flex-col items-center gap-8">
                <div className="relative group">
                  <div className="w-32 h-32 rounded-full bg-slate-800 ring-4 ring-indigo-500/20 overflow-hidden">
                    {manager.photo ? <img src={manager.photo} alt="Manager" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center bg-slate-900"><User className="w-12 h-12 text-slate-600" /></div>}
                  </div>
                  <button onClick={() => fileInputRef.current?.click()} className="absolute bottom-0 right-0 bg-indigo-600 p-2.5 rounded-full border-4 border-[#0f172a] text-white shadow-xl hover:bg-indigo-500 transition-all">
                    <Camera className="w-5 h-5" />
                  </button>
                </div>
                <div className="w-full space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">Manager Full Name</label>
                  <input type="text" value={tempManagerName} onChange={(e) => setTempManagerName(e.target.value)} className="w-full bg-slate-900 border border-white/5 rounded-2xl px-5 py-4 text-white font-bold focus:ring-2 focus:ring-indigo-500 outline-none transition-all" placeholder="Enter your name" />
                </div>

                <div className="w-full pt-6 border-t border-white/5 space-y-4">
                  <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Data Management</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <button onClick={exportData} className="flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-white py-3.5 rounded-2xl text-xs font-bold transition-all active:scale-95">
                      <Download className="w-4 h-4" /> Export Backup
                    </button>
                    <button onClick={() => document.getElementById('import-input')?.click()} className="flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-white py-3.5 rounded-2xl text-xs font-bold transition-all active:scale-95">
                      <Upload className="w-4 h-4" /> Import Backup
                    </button>
                    <input id="import-input" type="file" accept=".json" onChange={importData} className="hidden" />
                  </div>
                </div>

                <div className="w-full flex gap-3 pt-4">
                  <button onClick={() => setIsProfileModalOpen(false)} className="flex-1 py-4 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-bold transition-all">Cancel</button>
                  <button onClick={saveProfile} className="flex-1 py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition-all shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2">
                    <Check className="w-5 h-5" /> Save Changes
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {deleteConfirmId !== null && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setDeleteConfirmId(null)} className="absolute inset-0 bg-slate-950/90 backdrop-blur-md" />
            <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} className="relative w-full max-w-sm glass-card p-8 rounded-[2.5rem] border-rose-500/20 shadow-2xl bg-[#0f172a]">
              <div className="flex flex-col items-center text-center gap-6"><div className="w-20 h-20 rounded-full bg-rose-500/10 flex items-center justify-center"><Trash2 className="w-10 h-10 text-rose-500" /></div>
                <div><h3 className="text-xl font-black text-white mb-2">Confirm Delete</h3><p className="text-sm text-slate-400">Are you sure you want to remove this transaction? This action cannot be undone.</p></div>
                <div className="w-full flex flex-col gap-3 pt-4"><button onClick={confirmDelete} className="w-full py-4 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-bold transition-all shadow-lg shadow-rose-600/20">Yes, Delete Entry</button><button onClick={() => setDeleteConfirmId(null)} className="w-full py-4 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-bold transition-all">Cancel</button></div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function NavItem({ icon, label, active = false, onClick }: { icon: React.ReactNode, label: string, active?: boolean, onClick?: () => void }) {
  return (
    <button onClick={onClick} className={cn("w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all", active ? "bg-indigo-600/10 text-indigo-400 border border-indigo-500/20" : "text-slate-500 hover:text-slate-300 hover:bg-white/[0.02]")}>{icon}{label}</button>
  );
}

function StatCard({ label, value, unit, icon, color }: { label: string, value: string, unit: string, icon: React.ReactNode, color: 'blue' | 'rose' | 'emerald' | 'amber' }) {
  const colors = {
    blue: { border: "border-l-blue-500", bg: "from-blue-500/10 to-transparent", icon: "text-blue-400", glow: "group-hover:shadow-blue-500/10" },
    rose: { border: "border-l-rose-500", bg: "from-rose-500/10 to-transparent", icon: "text-rose-400", glow: "group-hover:shadow-rose-500/10" },
    emerald: { border: "border-l-emerald-500", bg: "from-emerald-500/10 to-transparent", icon: "text-emerald-400", glow: "group-hover:shadow-emerald-500/10" },
    amber: { border: "border-l-amber-500", bg: "from-amber-500/10 to-transparent", icon: "text-amber-400", glow: "group-hover:shadow-amber-500/10" },
  };
  return (
    <div className={cn("glass-card p-6 rounded-[2rem] border-l-4 transition-all duration-500 group relative overflow-hidden", colors[color].border, colors[color].glow)}>
      <div className={cn("absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-500", colors[color].bg)} /><div className="relative z-10"><div className="flex justify-between items-start mb-4"><p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">{label}</p><div className={cn("p-2 rounded-xl bg-white/5", colors[color].icon)}>{icon}</div></div><div className="flex items-baseline gap-2"><h3 className="text-3xl font-black tracking-tighter text-white">{value}</h3><span className="text-xs font-bold text-slate-500 uppercase">{unit}</span></div></div>
    </div>
  );
}
