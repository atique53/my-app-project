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
  Calendar,
  Moon,
  Sun,
  Command,
  Menu
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
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [isGlobalSearchOpen, setIsGlobalSearchOpen] = useState(false);
  const [globalSearchQuery, setGlobalSearchQuery] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [runningPrograms, setRunningPrograms] = useState<Record<string, boolean>>({});
  
  // Theme-aware styles
  const inputBg = theme === 'dark' ? 'bg-slate-800' : 'bg-slate-100';
  const inputBgDeep = theme === 'dark' ? 'bg-slate-900' : 'bg-slate-200';
  const textColor = theme === 'dark' ? 'text-slate-200' : 'text-slate-800';
  const headingColor = theme === 'dark' ? 'text-white' : 'text-slate-900';
  const borderColor = theme === 'dark' ? 'border-white/5' : 'border-slate-200';
  const mutedText = theme === 'dark' ? 'text-slate-500' : 'text-slate-400';
  
  // Filter States
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'receive' | 'delivery' | 'bill'>('all');
  const [filterPkgType, setFilterPkgType] = useState<'all' | 'Package' | 'Non-Package'>('all');
  const [filterMonth, setFilterMonth] = useState<string>('all');
  
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
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsGlobalSearchOpen(true);
      }
      if (e.key === 'Escape') {
        setIsGlobalSearchOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

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
        console.log('Fetching data from server...');
        const response = await fetch('/api/data');
        if (response.ok) {
          const data = await response.json();
          console.log('Data loaded from server:', data);
          if (data.transactions) setTransactions(data.transactions);
          if (data.manager) setManager(data.manager);
          if (data.notes) setNotes(data.notes);
          if (data.runningPrograms) setRunningPrograms(data.runningPrograms);
        } else {
          throw new Error('Server response not ok');
        }
      } catch (error) {
        console.error('Failed to load data from server, trying localStorage:', error);
        // Fallback to localStorage if server fails
        const savedData = localStorage.getItem('inventory_billing_data');
        const savedManager = localStorage.getItem('inventory_billing_manager');
        const savedNotes = localStorage.getItem('inventory_billing_notes');
        const savedRunning = localStorage.getItem('inventory_billing_running');
        if (savedData) setTransactions(JSON.parse(savedData));
        if (savedManager) setManager(JSON.parse(savedManager));
        if (savedNotes) setNotes(JSON.parse(savedNotes));
        if (savedRunning) setRunningPrograms(JSON.parse(savedRunning));
      } finally {
        setIsDataLoaded(true);
      }
    };
    loadData();
  }, []);

  // Auto-save whenever data changes, but only after initial load
  useEffect(() => {
    if (isDataLoaded) {
      const timer = setTimeout(() => {
        saveData(transactions, manager, notes, runningPrograms);
      }, 2000); // Debounce save to 2 seconds
      return () => clearTimeout(timer);
    }
  }, [transactions, manager, notes, runningPrograms, isDataLoaded]);

  // Auto-generate Challan Reference
  useEffect(() => {
    if (!editingId && (formData.type === 'receive' || formData.type === 'delivery')) {
      const qty = formData.type === 'receive' ? formData.amount : formData.orderQty;
      if (formData.fabricName && qty) {
        const autoRef = `${formData.fabricName}_${qty}`;
        setFormData(prev => ({ ...prev, challan: autoRef }));
      }
    }
  }, [formData.fabricName, formData.amount, formData.orderQty, formData.type, editingId]);

  // Save data to server
  const saveData = async (currentTransactions: Transaction[], currentManager: Manager, currentNotes?: Note[], currentRunning?: Record<string, boolean>) => {
    if (!isDataLoaded) return; // Prevent saving before loading
    
    setIsSaving(true);
    try {
      const payload = { 
        transactions: currentTransactions, 
        manager: currentManager,
        notes: currentNotes || notes,
        runningPrograms: currentRunning || runningPrograms
      };
      
      const response = await fetch('/api/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error('Failed to save to server');

      // Also save to localStorage as backup
      localStorage.setItem('inventory_billing_data', JSON.stringify(currentTransactions));
      localStorage.setItem('inventory_billing_manager', JSON.stringify(currentManager));
      localStorage.setItem('inventory_billing_notes', JSON.stringify(currentNotes || notes));
      localStorage.setItem('inventory_billing_running', JSON.stringify(currentRunning || runningPrograms));
      console.log('Data saved successfully');
    } catch (error) {
      console.error('Failed to save data:', error);
      // Still save to localStorage even if server fails
      localStorage.setItem('inventory_billing_data', JSON.stringify(currentTransactions));
      localStorage.setItem('inventory_billing_manager', JSON.stringify(currentManager));
      localStorage.setItem('inventory_billing_notes', JSON.stringify(currentNotes || notes));
      localStorage.setItem('inventory_billing_running', JSON.stringify(currentRunning || runningPrograms));
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
        saveData(transactions, newManager, notes, runningPrograms);
      };
      reader.readAsDataURL(file);
    }
  };

  const saveProfile = () => {
    const newManager = { ...manager, name: tempManagerName };
    setManager(newManager);
    saveData(transactions, newManager, notes, runningPrograms);
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
            saveData(json.transactions, json.manager, notes, runningPrograms);
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
    
    const tDate = new Date(t.date);
    const tMonth = tDate.toLocaleString('en-US', { month: 'long' });
    const matchesMonth = filterMonth === 'all' || tMonth === filterMonth;

    return matchesSearch && matchesStartDate && matchesEndDate && matchesType && matchesPkgType && matchesMonth;
  });

  const filteredStats = filteredTransactions.reduce((acc, t) => {
    acc.received += (Number(t.receiveQty) || 0);
    acc.ordered += (Number(t.orderQty) || 0);
    acc.actualDelivered += (Number(t.delvA) || 0) + (Number(t.delvB) || 0);
    acc.bill += (Number(t.bill) || 0);
    acc.paid += (Number(t.paid) || 0);
    return acc;
  }, { received: 0, ordered: 0, actualDelivered: 0, bill: 0, paid: 0 });

  const buyerBalances = transactions.reduce((acc, t) => {
    const bill = Number(t.bill) || 0;
    const paid = Number(t.paid) || 0;
    if (!acc[t.buyer]) acc[t.buyer] = 0;
    acc[t.buyer] += (bill - paid);
    return acc;
  }, {} as Record<string, number>);

  const buyerDues = Object.entries(buyerBalances)
    .filter(([_, balance]) => balance > 0)
    .reduce((acc, [buyer, balance]) => ({ ...acc, [buyer]: balance }), {} as Record<string, number>);

  const buyerAdvances = Object.entries(buyerBalances)
    .filter(([_, balance]) => balance < 0)
    .reduce((acc, [buyer, balance]) => ({ ...acc, [buyer]: Math.abs(balance) }), {} as Record<string, number>);

  // Calculate Pending Grey Stock per Buyer/Fabric
  const pendingGreyStock = transactions.reduce((acc, t) => {
    const key = `${t.buyer}|${t.fabricName}`;
    if (!acc[key]) {
      acc[key] = { buyer: t.buyer, fabric: t.fabricName, received: 0, ordered: 0 };
    }
    acc[key].received += (Number(t.receiveQty) || 0);
    acc[key].ordered += (Number(t.orderQty) || 0);
    return acc;
  }, {} as Record<string, { buyer: string, fabric: string, received: number, ordered: number }>);

  const topPendingGrey = Object.values(pendingGreyStock)
    .map(item => ({ ...item, balance: item.received - item.ordered, isRunning: runningPrograms[`${item.buyer}|${item.fabric}`] || false }))
    .filter(item => item.balance > 0)
    .sort((a, b) => {
      if (a.isRunning && !b.isRunning) return -1;
      if (!a.isRunning && b.isRunning) return 1;
      return b.balance - a.balance;
    });

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
      actualDelivered: acc.actualDelivered + (t.delvA + t.delvB),
      bill: acc.bill + t.bill,
      paid: acc.paid + t.paid,
    }), { received: 0, ordered: 0, actualDelivered: 0, bill: 0, paid: 0 });
    
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
    <div className={cn(
      "min-h-screen flex flex-col lg:flex-row transition-colors duration-500 selection:bg-indigo-500/30",
      theme,
      theme === 'dark' ? "bg-[#020617] text-slate-200" : "bg-slate-50 text-slate-900"
    )}>
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
      {/* Global Search Modal */}
      <AnimatePresence>
        {isGlobalSearchOpen && (
          <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[10vh] px-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              onClick={() => setIsGlobalSearchOpen(false)}
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -20 }}
              className={cn(
                "relative w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden border transition-colors duration-500",
                theme === 'dark' ? "bg-slate-900 border-white/10" : "bg-white border-slate-200"
              )}
            >
              <div className={cn(
                "p-4 border-b flex items-center gap-4",
                theme === 'dark' ? "border-white/5" : "border-slate-100"
              )}>
                <Search className="w-5 h-5 text-slate-500" />
                <input 
                  autoFocus
                  type="text" 
                  placeholder="Search transactions, buyers, fabrics, challans..." 
                  value={globalSearchQuery}
                  onChange={e => setGlobalSearchQuery(e.target.value)}
                  className={cn(
                    "flex-1 bg-transparent border-none outline-none text-lg placeholder:text-slate-600",
                    theme === 'dark' ? "text-white" : "text-slate-900"
                  )}
                />
                <div className={cn(
                  "flex items-center gap-2 px-2 py-1 rounded-lg border",
                  theme === 'dark' ? "bg-slate-800/50 border-white/5" : "bg-slate-100 border-slate-200"
                )}>
                  <Command className="w-3 h-3 text-slate-500" />
                  <span className="text-[10px] font-bold text-slate-500">ESC</span>
                </div>
              </div>
              
              <div className="max-h-[60vh] overflow-y-auto p-2 custom-scrollbar">
                {globalSearchQuery.trim() === '' ? (
                  <div className="p-8 text-center">
                    <div className="w-12 h-12 bg-indigo-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <Search className="w-6 h-6 text-indigo-400" />
                    </div>
                    <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Global Search</p>
                    <p className="text-xs text-slate-500 mt-2">Start typing to search across the entire ledger...</p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {transactions
                      .filter(t => 
                        t.buyer.toLowerCase().includes(globalSearchQuery.toLowerCase()) ||
                        t.fabricName.toLowerCase().includes(globalSearchQuery.toLowerCase()) ||
                        t.challan.toLowerCase().includes(globalSearchQuery.toLowerCase()) ||
                        t.type.toLowerCase().includes(globalSearchQuery.toLowerCase())
                      )
                      .slice(0, 20)
                      .map(t => (
                        <button 
                          key={t.id}
                          onClick={() => {
                            setFilterBuyer(t.buyer);
                            setIsGlobalSearchOpen(false);
                            setGlobalSearchQuery('');
                            document.getElementById('ledger-section')?.scrollIntoView({ behavior: 'smooth' });
                          }}
                          className={cn(
                            "w-full flex items-center justify-between p-4 rounded-2xl transition-all text-left group",
                            theme === 'dark' ? "hover:bg-white/5" : "hover:bg-slate-50"
                          )}
                        >
                          <div className="flex items-center gap-4">
                            <div className={cn(
                              "p-2.5 rounded-xl border",
                              t.type === 'receive' ? "bg-blue-500/10 border-blue-500/20 text-blue-400" :
                              t.type === 'delivery' ? "bg-indigo-500/10 border-indigo-500/20 text-indigo-400" :
                              "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                            )}>
                              {t.type === 'receive' ? <Inbox className="w-4 h-4" /> : 
                               t.type === 'delivery' ? <Truck className="w-4 h-4" /> : 
                               <Banknote className="w-4 h-4" />}
                            </div>
                            <div>
                              <p className={cn(
                                "font-bold transition-colors",
                                theme === 'dark' ? "text-white group-hover:text-indigo-400" : "text-slate-900 group-hover:text-indigo-600"
                              )}>{t.buyer}</p>
                              <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mt-0.5">
                                {t.fabricName} • Ref: {t.challan}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-xs font-bold text-slate-400">{t.date}</p>
                            <p className="text-[10px] text-slate-600 uppercase font-bold mt-1">{t.type}</p>
                          </div>
                        </button>
                      ))
                    }
                    {transactions.filter(t => 
                      t.buyer.toLowerCase().includes(globalSearchQuery.toLowerCase()) ||
                      t.fabricName.toLowerCase().includes(globalSearchQuery.toLowerCase()) ||
                      t.challan.toLowerCase().includes(globalSearchQuery.toLowerCase())
                    ).length === 0 && (
                      <div className="p-8 text-center">
                        <p className="text-sm font-bold text-slate-500 uppercase">No results found</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Sidebar Overlay for Mobile */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[45] lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-[50] w-72 border-r p-6 flex flex-col gap-8 print:hidden transition-all duration-500 lg:relative lg:translate-x-0",
        theme === 'dark' ? "bg-[#0f172a] border-white/5" : "bg-white border-slate-200 shadow-2xl lg:shadow-none",
        isSidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex items-center justify-between lg:justify-start gap-3 px-2">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-2.5 rounded-2xl shadow-lg shadow-indigo-500/20">
              <Factory className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-black tracking-tight text-white leading-none">PROFABRIC</h1>
              <p className="text-[10px] font-bold text-indigo-400 tracking-[0.2em] mt-1">ELITE LEDGER</p>
            </div>
          </div>
          <button 
            onClick={() => setIsSidebarOpen(false)}
            className="p-2 hover:bg-white/5 rounded-xl text-slate-500 lg:hidden"
          >
            <X className="w-5 h-5" />
          </button>
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
                theme={theme}
                onClick={() => {
                  setActiveTab('Dashboard');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              />
              <NavItem 
                icon={<History className="w-4 h-4" />} 
                label="History" 
                active={activeTab === 'History'}
                theme={theme}
                onClick={() => {
                  setActiveTab('History');
                  document.getElementById('ledger-section')?.scrollIntoView({ behavior: 'smooth' });
                }}
              />
              <NavItem 
                icon={<CreditCard className="w-4 h-4" />} 
                label="Payments" 
                active={activeTab === 'Payments'}
                theme={theme}
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
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-bold transition-all border",
                  theme === 'dark' ? "bg-slate-800 text-slate-300 hover:bg-slate-700 border-white/5" : "bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-200"
                )}
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
          <div className={cn("pt-4 border-t", theme === 'dark' ? "border-white/5" : "border-slate-100")}>
            <div className="flex items-center justify-between px-4 mb-4">
              <p className={cn("text-[11px] font-bold uppercase tracking-widest", mutedText)}>Buyer Notes</p>
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
                    className={cn(
                      "w-full border rounded-xl px-3 py-2 text-xs outline-none transition-all",
                      inputBg, borderColor, theme === 'dark' ? "text-white placeholder:text-slate-600" : "text-slate-900 placeholder:text-slate-400"
                    )}
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
                    note.completed ? "opacity-50" : (theme === 'dark' ? "hover:bg-white/5" : "hover:bg-slate-50")
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
                    <p className={cn("text-xs truncate", note.completed ? "text-slate-500 line-through" : (theme === 'dark' ? "text-slate-300" : "text-slate-700"))}>
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
      <main className={cn(
        "flex-1 p-6 lg:p-10 overflow-y-auto max-h-screen custom-scrollbar transition-colors duration-500 relative",
        theme === 'dark' 
          ? "bg-gradient-to-br from-[#020617] via-[#020617] to-indigo-950/20" 
          : "bg-slate-50"
      )}>
        {/* Sticky Header with Greeting and Tools */}
        <div className={cn(
          "sticky top-0 z-40 py-4 -mx-6 lg:-mx-10 px-6 lg:px-10 backdrop-blur-xl border-b transition-all shadow-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-10 print:hidden",
          theme === 'dark' ? "bg-[#020617]/90 border-white/10 shadow-indigo-500/5" : "bg-white/90 border-slate-200 shadow-slate-200/50"
        )}>
          <div className="flex items-center gap-4 w-full md:w-auto">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className={cn(
                "p-3 border rounded-2xl lg:hidden transition-all",
                theme === 'dark' ? "bg-slate-900/50 border-white/5 text-slate-400 hover:text-white" : "bg-slate-100 border-slate-200 text-slate-500 hover:text-slate-900"
              )}
            >
              <Menu className="w-6 h-6" />
            </button>
            <div>
              <h2 className={cn("text-lg md:text-xl font-black tracking-tight", theme === 'dark' ? "text-white" : "text-slate-900")}>Assalamu Alaikom</h2>
              <p className="text-slate-500 text-[10px] md:text-[10px] font-bold uppercase tracking-[0.2em] mt-0.5 flex items-center gap-2">
                <ShieldCheck className="w-3 h-3 text-indigo-500" />
                Elite Dashboard • {manager.name}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 md:gap-3 w-full md:w-auto justify-between md:justify-end">
            <div className={cn(
              "flex items-center gap-1 p-1 rounded-xl border",
              theme === 'dark' ? "bg-slate-900/50 border-white/5" : "bg-slate-100 border-slate-200"
            )}>
              <button 
                onClick={() => {
                  const entrySection = document.getElementById('new-entry-section');
                  entrySection?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="p-2 text-indigo-400 hover:text-white hover:bg-indigo-500/20 rounded-lg transition-all"
                title="New Entry"
              >
                <Plus className="w-4 h-4" />
              </button>
              <div className={cn("w-px h-4 mx-1", theme === 'dark' ? "bg-white/10" : "bg-slate-300")} />
              <button 
                onClick={() => setIsGlobalSearchOpen(true)}
                className="p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-all"
                title="Global Search"
              >
                <Search className="w-4 h-4" />
              </button>
              <div className={cn("w-px h-4 mx-1", theme === 'dark' ? "bg-white/10" : "bg-slate-300")} />
              <button 
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className="p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-all"
                title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              >
                {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
            </div>
            
            <div className="flex items-center gap-2 md:gap-3">
              <div className={cn(
                "glass-card px-3 md:px-4 py-2 rounded-xl flex items-center gap-2 md:gap-3 border",
                theme === 'dark' ? "border-white/5" : "border-slate-200 bg-slate-100"
              )}>
                <div className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] md:text-xs font-bold text-slate-400 whitespace-nowrap">{new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
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
                className={cn(
                  "p-2 md:p-2.5 rounded-xl border transition-all",
                  theme === 'dark' ? "bg-slate-800 hover:bg-slate-700 text-white border-white/5" : "bg-slate-100 hover:bg-slate-200 text-slate-900 border-slate-200"
                )}
                title="Export Full Ledger"
              >
                <Download className="w-4 h-4 md:w-5 md:h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 md:gap-6 mb-10 print:hidden">
          <StatCard label="Total Received" value={`${stats.received.toLocaleString()}`} unit="Yds" icon={<ArrowDownCircle className="w-5 h-5" />} color="blue" theme={theme} />
          <StatCard label="Total Ordered" value={`${stats.ordered.toLocaleString()}`} unit="Yds" icon={<ArrowUpCircle className="w-5 h-5" />} color="amber" theme={theme} />
          <StatCard label="Current Stock" value={`${(stats.received - stats.ordered).toLocaleString()}`} unit="Yds" icon={<Package className="w-5 h-5" />} color="blue" theme={theme} />
          <StatCard 
            label={stats.bill - stats.paid >= 0 ? "Total Due" : "Total Advance"} 
            value={`${Math.abs(stats.bill - stats.paid).toLocaleString()}`} 
            unit="৳" 
            icon={<CreditCard className="w-5 h-5" />} 
            color={stats.bill - stats.paid > 0 ? "rose" : (stats.bill - stats.paid < 0 ? "emerald" : "blue")} 
            theme={theme} 
          />
        </div>

        {/* Pending Grey Stock Summary */}
        {topPendingGrey.length > 0 && (
          <div className="mb-8 print:hidden">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-blue-500/10 rounded-xl border border-blue-500/20">
                <TrendingUp className="w-4 h-4 text-blue-400" />
              </div>
              <div>
                <h3 className={cn("text-base md:text-sm font-black uppercase tracking-widest", headingColor)}>Pending Grey Stock</h3>
                <p className={cn("text-[8px] md:text-[10px] font-bold uppercase tracking-widest mt-0.5", mutedText)}>Fabric remaining for processing</p>
              </div>
            </div>
            {/* Desktop Grid View */}
            <div className="hidden md:grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {topPendingGrey.slice(0, 8).map((item, idx) => (
                <div 
                  key={idx} 
                  className={cn(
                    "glass-card p-5 rounded-3xl border transition-all hover:scale-[1.02] cursor-pointer group relative",
                    theme === 'dark' ? "bg-slate-900/40 border-white/5" : "bg-white border-slate-200 shadow-sm",
                    item.isRunning && (theme === 'dark' ? "border-emerald-500/40 bg-emerald-500/[0.03]" : "border-emerald-300 bg-emerald-50")
                  )}
                  onClick={() => {
                    setFilterBuyer(item.buyer);
                    document.getElementById('ledger-section')?.scrollIntoView({ behavior: 'smooth' });
                  }}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex flex-col gap-1">
                      <p className={cn("text-xs font-black uppercase tracking-[0.15em] truncate max-w-[140px]", mutedText)}>{item.buyer}</p>
                      {item.isRunning && (
                        <span className="text-[10px] font-black text-emerald-500 uppercase tracking-wider flex items-center gap-1.5">
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          Program Running
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <input 
                        type="checkbox" 
                        checked={item.isRunning}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => {
                          e.stopPropagation();
                          const key = `${item.buyer}|${item.fabric}`;
                          const updated = { ...runningPrograms, [key]: e.target.checked };
                          setRunningPrograms(updated);
                          saveData(transactions, manager, notes, updated);
                        }}
                        className="w-5 h-5 rounded-lg border-slate-700 bg-slate-800 text-emerald-500 focus:ring-emerald-500/20 cursor-pointer"
                      />
                    </div>
                  </div>

                  <div className="mb-4">
                    <h4 className={cn("text-base font-black tracking-tight truncate mb-1", headingColor)}>{item.fabric}</h4>
                    <span className={cn("text-sm font-black", item.isRunning ? "text-emerald-400" : "text-blue-400")}>
                      {item.balance.toLocaleString()} <span className="text-[10px] uppercase opacity-60">Yds Remaining</span>
                    </span>
                  </div>

                  <div className="mt-4 w-full h-2 bg-slate-800/50 rounded-full overflow-hidden border border-white/5">
                    <div 
                      className={cn("h-full rounded-full transition-all duration-1000", item.isRunning ? "bg-gradient-to-r from-emerald-600 to-emerald-400" : "bg-gradient-to-r from-blue-600 to-blue-400")}
                      style={{ width: `${Math.min(100, (item.ordered / item.received) * 100)}%` }}
                    />
                  </div>

                  <div className="flex justify-between mt-3 pt-3 border-t border-white/5">
                    <div className="flex flex-col">
                      <span className="text-[9px] font-bold text-slate-500 uppercase tracking-tighter">Processed</span>
                      <span className={cn("text-xs font-black", headingColor)}>{Math.round((item.ordered / item.received) * 100)}%</span>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="text-[9px] font-bold text-slate-500 uppercase tracking-tighter">Total Stock</span>
                      <span className={cn("text-xs font-black", headingColor)}>{item.received.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Mobile Zebra View */}
            <div className="md:hidden glass-card rounded-3xl overflow-hidden border border-white/5">
              <div className="divide-y divide-white/5">
                {topPendingGrey.slice(0, 12).map((item, idx) => (
                  <div 
                    key={idx}
                    className={cn(
                      "p-4 flex items-center justify-between gap-3 transition-all active:bg-indigo-500/10",
                      idx % 2 === 0 ? (theme === 'dark' ? "bg-slate-800/20" : "bg-slate-50/50") : "bg-transparent",
                      item.isRunning && (theme === 'dark' ? "bg-emerald-500/[0.05] border-l-4 border-l-emerald-500" : "bg-emerald-50 border-l-4 border-l-emerald-500")
                    )}
                    onClick={() => {
                      setFilterBuyer(item.buyer);
                      document.getElementById('ledger-section')?.scrollIntoView({ behavior: 'smooth' });
                    }}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className={cn("text-[10px] font-black uppercase tracking-wider truncate", mutedText)}>{item.buyer}</p>
                        {item.isRunning && (
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        )}
                      </div>
                      <h4 className={cn("text-sm font-black tracking-tight truncate", headingColor)}>{item.fabric}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex-1 h-1 bg-slate-800/50 rounded-full overflow-hidden">
                          <div 
                            className={cn("h-full rounded-full", item.isRunning ? "bg-emerald-500" : "bg-blue-500")}
                            style={{ width: `${Math.min(100, (item.ordered / item.received) * 100)}%` }}
                          />
                        </div>
                        <span className="text-[9px] font-bold text-slate-500">{Math.round((item.ordered / item.received) * 100)}%</span>
                      </div>
                    </div>
                    
                    <div className="flex flex-col items-end gap-2">
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className={cn("text-xs font-black", item.isRunning ? "text-emerald-400" : "text-blue-400")}>{item.balance.toLocaleString()}</p>
                          <p className="text-[8px] font-bold text-slate-500 uppercase tracking-tighter">Rem. Yds</p>
                        </div>
                        <input 
                          type="checkbox" 
                          checked={item.isRunning}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => {
                            e.stopPropagation();
                            const key = `${item.buyer}|${item.fabric}`;
                            const updated = { ...runningPrograms, [key]: e.target.checked };
                            setRunningPrograms(updated);
                            saveData(transactions, manager, notes, updated);
                          }}
                          className="w-5 h-5 rounded-lg border-slate-700 bg-slate-800 text-emerald-500 focus:ring-emerald-500/20"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Financial Summary Section (Dues & Advances) */}
        {(Object.keys(buyerDues).length > 0 || Object.keys(buyerAdvances).length > 0) && (
          <div id="dues-section" className="mb-8 print:hidden scroll-mt-10">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Dues */}
              {Object.keys(buyerDues).length > 0 && (
                <div>
                  <h3 className="text-sm md:text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-rose-500" />
                    Outstanding Dues
                  </h3>
                  <div className="flex flex-wrap gap-3">
                    {Object.entries(buyerDues).map(([buyer, due]) => (
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        key={buyer} 
                        className={cn(
                          "glass-card px-4 py-3 rounded-2xl border-l-4 border-l-rose-500 flex flex-col cursor-pointer transition-all",
                          theme === 'dark' ? "hover:bg-slate-800" : "hover:bg-slate-100"
                        )}
                        onClick={() => setSelectedStatementBuyer(buyer)}
                      >
                        <span className="text-[10px] font-bold text-slate-500 uppercase">{buyer}</span>
                        <span className="text-sm font-black text-rose-400">৳ {due.toLocaleString()}</span>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

              {/* Advances */}
              {Object.keys(buyerAdvances).length > 0 && (
                <div>
                  <h3 className="text-sm md:text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <Banknote className="w-4 h-4 text-emerald-500" />
                    Advance Payments
                  </h3>
                  <div className="flex flex-wrap gap-3">
                    {Object.entries(buyerAdvances).map(([buyer, advance]) => (
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        key={buyer} 
                        className={cn(
                          "glass-card px-4 py-3 rounded-2xl border-l-4 border-l-emerald-500 flex flex-col cursor-pointer transition-all",
                          theme === 'dark' ? "hover:bg-slate-800" : "hover:bg-slate-100"
                        )}
                        onClick={() => setSelectedStatementBuyer(buyer)}
                      >
                        <span className="text-[10px] font-bold text-slate-500 uppercase">{buyer}</span>
                        <span className="text-sm font-black text-emerald-400">৳ {advance.toLocaleString()}</span>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}
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
                <h3 className="text-xl md:text-lg font-bold">Buyer Statement</h3>
                <p className="text-[10px] md:text-xs text-slate-500">View and export detailed history for a specific buyer</p>
              </div>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <select 
                value={selectedStatementBuyer}
                onChange={(e) => setSelectedStatementBuyer(e.target.value)}
                className={cn(
                  "border-none rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 w-full sm:w-64",
                  inputBg,
                  theme === 'dark' ? "text-white" : "text-slate-900"
                )}
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
              <div className="glass-card p-8 rounded-3xl relative overflow-hidden print:bg-white print:text-black print:border-none print:shadow-none print:p-0">
                {/* PDF/Print Header with Logo */}
                <div className="hidden print:block mb-10 border-b-4 border-indigo-600 pb-8">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-xl">
                        <Factory className="w-10 h-10" />
                      </div>
                      <div>
                        <h1 className="text-4xl font-black uppercase tracking-tighter text-indigo-950">PRO FABRIC ELITE</h1>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-[0.3em]">Inventory & Billing Solutions</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-indigo-600 uppercase tracking-widest mb-1">Statement Summary</p>
                      <p className="text-xs text-slate-500 font-mono">Date: {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                      <p className="text-xs text-slate-500 font-mono">Time: {new Date().toLocaleTimeString()}</p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 print:mb-10">
                  <div>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1 print:text-indigo-600 print:mb-2">Statement For Client</p>
                    <h2 className="text-4xl font-black tracking-tighter print:text-5xl print:text-indigo-950">{selectedStatementBuyer}</h2>
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
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-8 print:grid-cols-5 print:gap-4 print:mb-12">
                      <div className="bg-slate-800/50 p-4 rounded-2xl print:bg-white print:border-2 print:border-slate-100 print:shadow-sm">
                        <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1 print:text-indigo-600">Received</p>
                        <p className="text-xl font-black print:text-2xl print:text-indigo-950">{summary.received.toLocaleString()} Yds</p>
                      </div>
                      <div className="bg-slate-800/50 p-4 rounded-2xl print:bg-white print:border-2 print:border-slate-100 print:shadow-sm">
                        <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1 print:text-indigo-600">Ordered</p>
                        <p className="text-xl font-black print:text-2xl print:text-indigo-950">{summary.ordered.toLocaleString()} Yds</p>
                      </div>
                      <div className="bg-slate-800/50 p-4 rounded-2xl print:bg-white print:border-2 print:border-indigo-50 print:shadow-sm">
                        <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1 print:text-indigo-600">Actual Delv.</p>
                        <p className="text-xl font-black print:text-2xl print:text-indigo-950">{(summary.actualDelivered).toLocaleString()} Yds</p>
                      </div>
                      <div className="bg-slate-800/50 p-4 rounded-2xl print:bg-white print:border-2 print:border-slate-100 print:shadow-sm">
                        <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1 print:text-indigo-600">Total Bill</p>
                        <p className="text-xl font-black print:text-2xl print:text-indigo-950">৳ {summary.bill.toLocaleString()}</p>
                      </div>
                      <div className="bg-slate-800/50 p-4 rounded-2xl print:bg-white print:border-2 print:border-rose-50 print:shadow-sm">
                        <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1 print:text-rose-600">Balance Due</p>
                        <p className={cn("text-xl font-black print:text-2xl", summary.bill - summary.paid > 0 ? "text-rose-400 print:text-rose-600" : "text-emerald-400 print:text-emerald-600")}>
                          ৳ {(summary.bill - summary.paid).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  );
                })()}

                <div className="overflow-x-auto print:overflow-visible">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-800/30 text-[11px] font-bold text-slate-400 uppercase tracking-widest print:bg-indigo-600 print:text-white">
                        <th className="px-4 py-4 print:rounded-l-xl">Date</th>
                        <th className="px-4 py-4">Type</th>
                        <th className="px-4 py-4">Fabric / Category</th>
                        <th className="px-4 py-4">Ref</th>
                        <th className="px-4 py-4 text-right">Recv</th>
                        <th className="px-4 py-4 text-right">Order</th>
                        <th className="px-4 py-4 text-right">Actual Delv</th>
                        <th className="px-4 py-4 text-right">Bill</th>
                        <th className="px-4 py-4 text-right print:rounded-r-xl">Paid</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 print:divide-slate-200">
                      {getBuyerStatementData(selectedStatementBuyer).transactions.map((t, idx) => (
                        <tr key={t.id} className={cn(
                          "text-xs transition-colors",
                          idx % 2 === 0 ? "bg-white/[0.02] print:bg-slate-50/50" : "bg-transparent print:bg-white",
                          "print:text-indigo-950"
                        )}>
                          <td className="px-4 py-4 font-mono">{t.date}</td>
                          <td className="px-4 py-4">
                            <span className={cn(
                              "px-2 py-1 rounded-full text-[10px] font-bold uppercase",
                              t.type === 'receive' ? "bg-blue-500/10 text-blue-400 print:text-blue-600" : 
                              t.type === 'delivery' ? "bg-indigo-500/10 text-indigo-400 print:text-indigo-600" : 
                              "bg-emerald-500/10 text-emerald-400 print:text-emerald-600"
                            )}>
                              {t.type}
                            </span>
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex flex-col">
                              <span className="font-bold text-slate-200 print:text-indigo-950">{t.fabricName}</span>
                              <span className="text-[9px] text-slate-500 uppercase">{t.pkgType}</span>
                            </div>
                          </td>
                          <td className="px-4 py-4 text-slate-400 print:text-slate-600">{t.challan}</td>
                          <td className="px-4 py-4 text-right font-mono text-blue-400 print:text-blue-600">{t.receiveQty > 0 ? t.receiveQty.toLocaleString() : '-'}</td>
                          <td className="px-4 py-4 text-right font-mono text-indigo-400 print:text-indigo-600">{t.orderQty > 0 ? t.orderQty.toLocaleString() : '-'}</td>
                          <td className="px-4 py-4 text-right font-mono text-indigo-400 print:text-indigo-800 font-bold">{(t.delvA + t.delvB) > 0 ? (t.delvA + t.delvB).toLocaleString() : '-'}</td>
                          <td className="px-4 py-4 text-right font-mono text-slate-200 print:text-indigo-950">৳ {t.bill.toLocaleString()}</td>
                          <td className="px-4 py-4 text-right font-mono text-emerald-400 print:text-emerald-600">৳ {t.paid.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Print Footer */}
                <div className="hidden print:flex justify-between items-end mt-20 pt-10 border-t border-slate-200">
                  <div className="space-y-4">
                    <div className="w-40 h-px bg-slate-400" />
                    <p className="text-xs font-bold text-slate-600 uppercase tracking-widest">Client Signature</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] text-slate-400 italic mb-2">This is a computer generated statement</p>
                    <div className="flex items-center gap-2 justify-center">
                      <div className="w-2 h-2 rounded-full bg-indigo-600" />
                      <p className="text-xs font-black text-indigo-950">PRO FABRIC ELITE</p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="w-40 h-px bg-slate-400" />
                    <p className="text-xs font-bold text-slate-600 uppercase tracking-widest">Authorized Signature</p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 mb-8 print:hidden" id="new-entry-section">
          <div className="xl:col-span-5 glass-card p-6 rounded-3xl">
            <h3 className="text-xl md:text-lg font-bold mb-6 flex items-center gap-2"><PlusCircle className="w-5 h-5 text-indigo-500" /> {editingId ? 'Edit Entry' : 'New Transaction'}</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className={cn("text-[11px] font-bold uppercase tracking-wide", mutedText)}>Date</label>
                  <input type="date" value={formData.date} onChange={e => setFormData(prev => ({ ...prev, date: e.target.value }))} className={cn("w-full border-none rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500", inputBg, theme === 'dark' ? "text-white" : "text-slate-900")} />
                </div>
                <div className="space-y-1.5">
                  <label className={cn("text-[11px] font-bold uppercase tracking-wide", mutedText)}>Category</label>
                  <select value={formData.pkgType} onChange={e => setFormData(prev => ({ ...prev, pkgType: e.target.value as any }))} className={cn("w-full border-none rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500", inputBg, theme === 'dark' ? "text-white" : "text-slate-900")}>
                    <option value="Non-Package">Non-Package</option>
                    <option value="Package">Package</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className={cn("text-[11px] font-bold uppercase tracking-wide", mutedText)}>Buyer Name</label>
                    {formData.buyer && buyerBalances[formData.buyer] !== undefined && Math.abs(buyerBalances[formData.buyer]) > 0.01 && (
                      <span className={cn("text-[9px] font-bold animate-pulse", buyerBalances[formData.buyer] > 0 ? "text-rose-400" : "text-emerald-400")}>
                        {buyerBalances[formData.buyer] > 0 ? "Due: ৳ " : "Adv: ৳ "}{Math.abs(buyerBalances[formData.buyer]).toLocaleString()}
                      </span>
                    )}
                  </div>
                  <input type="text" required list="buyer-suggestions" placeholder="Enter Name" value={formData.buyer} onChange={e => setFormData(prev => ({ ...prev, buyer: e.target.value }))} className={cn("w-full border-none rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500", inputBg, theme === 'dark' ? "text-white" : "text-slate-900")} />
                  <datalist id="buyer-suggestions">{uniqueBuyers.map(buyer => <option key={buyer} value={buyer} />)}</datalist>
                </div>
                <div className="space-y-1.5">
                  <label className={cn("text-[11px] font-bold uppercase tracking-wide", mutedText)}>Fabric Name</label>
                  <input type="text" list="fabric-suggestions" placeholder="e.g. Cotton" value={formData.fabricName} onChange={e => setFormData(prev => ({ ...prev, fabricName: e.target.value }))} className={cn("w-full border-none rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500", inputBg, theme === 'dark' ? "text-white" : "text-slate-900")} />
                  <datalist id="fabric-suggestions">{uniqueFabrics.map(fabric => <option key={fabric} value={fabric} />)}</datalist>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className={cn("text-[11px] font-bold uppercase tracking-wide", mutedText)}>Challan / Ref</label>
                <input type="text" placeholder="Ref No" value={formData.challan} onChange={e => setFormData(prev => ({ ...prev, challan: e.target.value }))} className={cn("w-full border-none rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500", inputBg, theme === 'dark' ? "text-white" : "text-slate-900")} />
              </div>
              <div className="space-y-1.5">
                <label className={cn("text-[11px] font-bold uppercase tracking-wide", mutedText)}>Entry Type</label>
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
                          formData.type === type ? `${activeColor} text-white shadow-lg` : cn(inputBg, "border-transparent text-slate-400 hover:bg-slate-700")
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
                      <label className={cn("text-[11px] font-bold uppercase tracking-wide", mutedText)}>Quantity Received (Yds)</label>
                      <input type="number" placeholder="0.00" value={formData.amount} onChange={e => setFormData(prev => ({ ...prev, amount: e.target.value }))} className={cn("w-full border-none rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 font-mono", inputBgDeep, theme === 'dark' ? "text-white" : "text-slate-900")} />
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
                      <input type="number" placeholder="0.00" value={formData.orderQty} onChange={e => setFormData(prev => ({ ...prev, orderQty: e.target.value }))} className={cn("w-full border-none rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 font-mono", inputBgDeep, theme === 'dark' ? "text-white" : "text-slate-900")} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className={cn("text-[11px] font-bold uppercase tracking-wide", mutedText)}>A Grade Delv.</label>
                        <input type="number" placeholder="0" value={formData.delvA} onChange={e => setFormData(prev => ({ ...prev, delvA: e.target.value }))} className={cn("w-full border-none rounded-xl px-4 py-2 text-sm font-mono", inputBgDeep, theme === 'dark' ? "text-white" : "text-slate-900")} />
                      </div>
                      <div className="space-y-1.5">
                        <label className={cn("text-[11px] font-bold uppercase tracking-wide", mutedText)}>B Grade Delv.</label>
                        <input type="number" placeholder="0" value={formData.delvB} onChange={e => setFormData(prev => ({ ...prev, delvB: e.target.value }))} className={cn("w-full border-none rounded-xl px-4 py-2 text-sm font-mono", inputBgDeep, theme === 'dark' ? "text-white" : "text-slate-900")} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className={cn("text-[11px] font-bold uppercase tracking-wide", mutedText)}>Price A (৳)</label>
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
                          className={cn("w-full border-none rounded-xl px-4 py-2 text-sm font-mono", inputBgDeep, theme === 'dark' ? "text-white" : "text-slate-900")} 
                        />
                      </div>
                      <div className="space-y-1.5">
                        <div className="flex justify-between items-center">
                          <label className={cn("text-[11px] font-bold uppercase tracking-wide", mutedText)}>Total Bill</label>
                          <span className="text-[8px] text-slate-500 uppercase font-bold italic">B-Grade = 50% Price</span>
                        </div>
                        <div className={cn("w-full rounded-xl px-4 py-2 text-sm font-bold text-indigo-400 border shadow-inner", inputBgDeep, theme === 'dark' ? "border-indigo-500/30 shadow-indigo-500/10" : "border-indigo-200 shadow-indigo-100")}>৳ {calculateBilling().toLocaleString()}</div>
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
                        className={cn("w-full border-none rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500 font-bold text-emerald-400 font-mono", inputBgDeep)} 
                      />
                    </div>
                  </motion.div>
                )}
                {formData.type === 'bill' && (
                  <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="space-y-4 p-4 bg-emerald-600/5 rounded-2xl border border-emerald-500/20">
                    <div className="flex items-center gap-2 text-emerald-400 mb-2">
                      <Banknote className="w-4 h-4" />
                      <span className="text-xs font-bold uppercase tracking-wider">Financial Transaction</span>
                    </div>

                    {formData.buyer && buyerBalances[formData.buyer] !== undefined && Math.abs(buyerBalances[formData.buyer]) > 0.01 && (
                      <div className={cn(
                        "p-3 rounded-xl border flex justify-between items-center mb-2",
                        buyerBalances[formData.buyer] > 0 ? "bg-rose-500/10 border-rose-500/20" : "bg-emerald-500/10 border-emerald-500/20"
                      )}>
                        <div className="flex flex-col">
                          <span className={cn("text-[10px] font-bold uppercase tracking-widest", buyerBalances[formData.buyer] > 0 ? "text-rose-500" : "text-emerald-500")}>
                            {buyerBalances[formData.buyer] > 0 ? "Outstanding Due" : "Advance Balance"}
                          </span>
                          <span className={cn("text-[8px] font-medium uppercase mt-0.5", buyerBalances[formData.buyer] > 0 ? "text-rose-400/60" : "text-emerald-400/60")}>
                            Automatic Balance Detection
                          </span>
                        </div>
                        <span className={cn("text-lg font-black", buyerBalances[formData.buyer] > 0 ? "text-rose-400" : "text-emerald-400")}>
                          ৳ {Math.abs(buyerBalances[formData.buyer]).toLocaleString()}
                        </span>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className={cn("text-[11px] font-bold uppercase tracking-wide", mutedText)}>New Bill (৳)</label>
                        <input type="number" placeholder="0.00" value={formData.billEntry} onChange={e => setFormData(prev => ({ ...prev, billEntry: e.target.value }))} className={cn("w-full border-none rounded-xl px-4 py-2.5 text-sm font-mono", inputBgDeep, theme === 'dark' ? "text-white" : "text-slate-900")} />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-emerald-400 uppercase tracking-wide">Paid Bill (৳)</label>
                        <input type="number" placeholder="0.00" value={formData.paidEntry} onChange={e => setFormData(prev => ({ ...prev, paidEntry: e.target.value }))} className={cn("w-full border-none rounded-xl px-4 py-2.5 text-sm font-mono focus:ring-2 focus:ring-emerald-500", inputBgDeep, theme === 'dark' ? "text-white" : "text-slate-900")} />
                      </div>
                    </div>
                    <div className={cn("p-3 rounded-xl border flex justify-between items-center", theme === 'dark' ? "bg-emerald-500/10 border-emerald-500/20" : "bg-emerald-50 border-emerald-100")}>
                      <span className={cn("text-[10px] font-bold uppercase tracking-wide", theme === 'dark' ? "text-emerald-500" : "text-emerald-600")}>Transaction Balance</span>
                      <span className={cn("text-sm font-bold", theme === 'dark' ? "text-emerald-400" : "text-emerald-700")}>৳ {((parseFloat(formData.billEntry) || 0) - (parseFloat(formData.paidEntry) || 0)).toLocaleString()}</span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Financial Summary Preview */}
              {(parseFloat(formData.amount) > 0 || parseFloat(formData.orderQty) > 0 || parseFloat(formData.billEntry) > 0 || parseFloat(formData.paidEntry) > 0) && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-4 bg-slate-800/50 rounded-2xl border border-slate-700/50 space-y-2">
                  <div className="flex justify-between items-center text-[11px] md:text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <span className="text-xs md:text-[11px]">Transaction Summary</span>
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
                <button 
                  type="button" 
                  onClick={() => {
                    setFormData(prev => ({
                      ...prev,
                      buyer: '',
                      fabricName: '',
                      challan: '',
                      amount: ''
                    }));
                  }}
                  className="px-6 bg-slate-800 hover:bg-slate-700 text-white rounded-2xl font-bold transition-all"
                >
                  Clear
                </button>
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
                  <h3 className={cn("text-2xl md:text-xl font-black tracking-tight", headingColor)}>Transaction Ledger</h3>
                  <p className={cn("text-[10px] md:text-[10px] font-bold uppercase tracking-[0.1em] mt-0.5", mutedText)}>Detailed Operations History</p>
                </div>
              </div>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input type="text" placeholder="Search Buyer / Ref..." value={filterBuyer} onChange={e => setFilterBuyer(e.target.value)} className={cn("w-full border-none rounded-xl pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500", inputBg, theme === 'dark' ? "text-white" : "text-slate-900")} />
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="space-y-1.5">
                <label className={cn("text-[11px] font-bold uppercase tracking-wide", mutedText)}>Month</label>
                <select value={filterMonth} onChange={e => setFilterMonth(e.target.value)} className={cn("w-full border-none rounded-xl px-4 py-2 text-xs focus:ring-2 focus:ring-indigo-500", theme === 'dark' ? "bg-slate-800/50 text-white" : "bg-slate-100 text-slate-900")}>
                  <option value="all">All Months</option>
                  {["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"].map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className={cn("text-[11px] font-bold uppercase tracking-wide", mutedText)}>Start Date</label>
                <input type="date" value={filterStartDate} onChange={e => setFilterStartDate(e.target.value)} className={cn("w-full border-none rounded-xl px-4 py-2 text-xs focus:ring-2 focus:ring-indigo-500", theme === 'dark' ? "bg-slate-800/50 text-white" : "bg-slate-100 text-slate-900")} />
              </div>
              <div className="space-y-1.5">
                <label className={cn("text-[11px] font-bold uppercase tracking-wide", mutedText)}>End Date</label>
                <input type="date" value={filterEndDate} onChange={e => setFilterEndDate(e.target.value)} className={cn("w-full border-none rounded-xl px-4 py-2 text-xs focus:ring-2 focus:ring-indigo-500", theme === 'dark' ? "bg-slate-800/50 text-white" : "bg-slate-100 text-slate-900")} />
              </div>
              <div className="space-y-1.5">
                <label className={cn("text-[11px] font-bold uppercase tracking-wide", mutedText)}>Trans. Type</label>
                <select value={filterType} onChange={e => setFilterType(e.target.value as any)} className={cn("w-full border-none rounded-xl px-4 py-2 text-xs focus:ring-2 focus:ring-indigo-500", theme === 'dark' ? "bg-slate-800/50 text-white" : "bg-slate-100 text-slate-900")}>
                  <option value="all">All Types</option>
                  <option value="receive">Receive</option>
                  <option value="delivery">Delivery</option>
                  <option value="bill">Bill</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className={cn("text-[11px] font-bold uppercase tracking-wide", mutedText)}>Pkg. Type</label>
                <select value={filterPkgType} onChange={e => setFilterPkgType(e.target.value as any)} className={cn("w-full border-none rounded-xl px-4 py-2 text-xs focus:ring-2 focus:ring-indigo-500", theme === 'dark' ? "bg-slate-800/50 text-white" : "bg-slate-100 text-slate-900")}>
                  <option value="all">All Packages</option>
                  <option value="Package">Package</option>
                  <option value="Non-Package">Non-Package</option>
                </select>
              </div>
            </div>

            {/* Filtered Summary Results */}
            <div className={cn(
              "grid grid-cols-2 md:grid-cols-5 gap-3 p-4 rounded-2xl border",
              theme === 'dark' ? "bg-white/[0.02] border-white/5" : "bg-slate-50 border-slate-200"
            )}>
              <div className="flex flex-col">
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Total Received</span>
                <span className="text-sm font-black text-blue-400">{filteredStats.received.toLocaleString()} Yds</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Total Ordered</span>
                <span className="text-sm font-black text-amber-400">{filteredStats.ordered.toLocaleString()} Yds</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Actual Delivered</span>
                <span className="text-sm font-black text-indigo-400">{filteredStats.actualDelivered.toLocaleString()} Yds</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Total Bill</span>
                <span className="text-sm font-black text-indigo-400">৳ {filteredStats.bill.toLocaleString()}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Total Paid</span>
                <span className="text-sm font-black text-emerald-400">৳ {filteredStats.paid.toLocaleString()}</span>
              </div>
            </div>
          </div>
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className={cn(
                  "text-[11px] font-bold uppercase tracking-[0.15em] border-y",
                  theme === 'dark' ? "bg-slate-800/50 text-slate-400 border-white/5" : "bg-slate-50 text-slate-600 border-slate-200"
                )}>
                  <th className="px-6 py-5">Date</th>
                  <th className="px-6 py-5">Buyer / Ref</th>
                  <th className="px-6 py-5 text-center">Quantity Details</th>
                  <th className="px-6 py-5">Financials</th>
                  <th className="px-6 py-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className={cn("divide-y", theme === 'dark' ? "divide-white/5" : "divide-slate-200")}>
                {sortedTransactions.map((t, index) => {
                  const due = t.bill - t.paid;
                  return (
                    <tr key={t.id} className={cn(
                      "group transition-all duration-300 border-b last:border-0", 
                      theme === 'dark' 
                        ? (index % 2 === 0 ? "bg-white/[0.02]" : "bg-transparent") 
                        : (index % 2 === 0 ? "bg-slate-50/50" : "bg-white"),
                      theme === 'dark' ? "hover:bg-white/[0.05] border-white/5" : "hover:bg-slate-100 border-slate-100",
                      due > 0 ? (theme === 'dark' ? "bg-rose-500/[0.04]" : "bg-rose-500/[0.02]") : (due < 0 ? (theme === 'dark' ? "bg-emerald-500/[0.04]" : "bg-emerald-500/[0.02]") : "")
                    )}>
                      <td className="px-6 py-5">
                        <div className="flex flex-col">
                          <span className={cn(
                            "text-sm font-bold tracking-tight group-hover:text-indigo-400 transition-colors",
                            theme === 'dark' ? "text-white" : "text-slate-900"
                          )}>{new Date(t.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                          <span className={cn("text-[10px] font-bold uppercase tracking-widest mt-1", mutedText)}>{t.pkgType}</span>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex flex-col">
                          <span className={cn("text-sm font-black tracking-tight", theme === 'dark' ? "text-slate-200" : "text-slate-800")}>{t.buyer}</span>
                          <div className="flex items-center gap-2 mt-1.5">
                            <span className="text-[10px] px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-400 font-bold border border-indigo-500/20">Ref: {t.challan}</span>
                            <span className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20">{t.fabricName}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        {t.type === 'receive' && <span className="text-blue-400 font-bold">+{t.receiveQty} Yds</span>}
                        {t.type === 'delivery' && (
                          <div className="flex flex-col items-center gap-1">
                            <span className="text-rose-400 font-bold text-xs">Ord: {t.orderQty}</span>
                            <span className="text-indigo-400 font-black text-sm">Delv: {t.delvA + t.delvB}</span>
                          </div>
                        )}
                        {t.type === 'bill' && <span className="text-slate-600">—</span>}
                      </td>
                      <td className="px-6 py-4">
                        {t.bill > 0 && <div className="text-indigo-300 font-bold text-xs">Bill: ৳ {t.bill.toLocaleString()}</div>}
                        {t.paid > 0 && <div className="text-emerald-500 font-bold text-xs">Paid: ৳ {t.paid.toLocaleString()}</div>}
                        {due > 0 ? (
                          <div className="text-rose-500 font-bold text-xs mt-1">Due: ৳ {due.toLocaleString()}</div>
                        ) : due < 0 ? (
                          <div className="text-emerald-500 font-bold text-xs mt-1">Advance: ৳ {Math.abs(due).toLocaleString()}</div>
                        ) : null}
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

        <footer className={cn(
          "mt-20 py-12 border-t text-center print:hidden",
          theme === 'dark' ? "border-white/5" : "border-slate-200"
        )}>
          <div className="flex flex-col items-center gap-6">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-2 rounded-xl shadow-lg shadow-indigo-500/20">
                <Factory className="w-5 h-5 text-white" />
              </div>
              <div className="text-left">
                <h4 className={cn("text-sm font-black tracking-tight leading-none", headingColor)}>PROFABRIC</h4>
                <p className="text-[8px] font-bold text-indigo-400 tracking-[0.2em] mt-1">ELITE LEDGER SYSTEMS</p>
              </div>
            </div>
            <p className={cn("text-xs max-w-md px-6 leading-relaxed", mutedText)}>The world-standard solution for textile inventory management and professional billing. Designed for precision, speed, and high-performance business tracking.</p>
            <div className="flex flex-wrap justify-center gap-x-8 gap-y-4">
              <a href="#" className={cn("text-[10px] font-bold hover:text-indigo-400 uppercase tracking-widest transition-all", mutedText)}>Privacy Policy</a>
              <a href="#" className={cn("text-[10px] font-bold hover:text-indigo-400 uppercase tracking-widest transition-all", mutedText)}>Terms of Service</a>
              <a href="#" className={cn("text-[10px] font-bold hover:text-indigo-400 uppercase tracking-widest transition-all", mutedText)}>Help Center</a>
              <a href="#" className={cn("text-[10px] font-bold hover:text-indigo-400 uppercase tracking-widest transition-all", mutedText)}>API Docs</a>
            </div>
            <div className="w-12 h-1 bg-gradient-to-r from-transparent via-indigo-500/20 to-transparent rounded-full" />
            <p className="text-[10px] text-slate-600 font-medium">© {new Date().getFullYear()} Profabric Elite. All rights reserved. Built for Excellence.</p>
          </div>
        </footer>
      </main>

      {/* Modals */}
      <AnimatePresence>
        {isProfileModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsProfileModalOpen(false)} className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 0.9, y: 20 }} 
              className={cn(
                "relative w-full max-w-md glass-card p-8 rounded-[2.5rem] border shadow-2xl transition-colors duration-500",
                theme === 'dark' ? "bg-[#0f172a] border-white/10" : "bg-white border-slate-200"
              )}
            >
              <div className="flex justify-between items-center mb-8">
                <h3 className={cn("text-xl font-black tracking-tight", headingColor)}>Edit Profile</h3>
                <button onClick={() => setIsProfileModalOpen(false)} className={cn("p-2 rounded-full transition-all", theme === 'dark' ? "hover:bg-white/5 text-slate-500 hover:text-white" : "hover:bg-slate-100 text-slate-400 hover:text-slate-900")}>
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="flex flex-col items-center gap-8">
                <div className="relative group">
                  <div className={cn("w-32 h-32 rounded-full ring-4 ring-indigo-500/20 overflow-hidden", inputBg)}>
                    {manager.photo ? <img src={manager.photo} alt="Manager" className="w-full h-full object-cover" /> : <div className={cn("w-full h-full flex items-center justify-center", inputBgDeep)}><User className="w-12 h-12 text-slate-600" /></div>}
                  </div>
                  <button onClick={() => fileInputRef.current?.click()} className={cn("absolute bottom-0 right-0 p-2.5 rounded-full border-4 text-white shadow-xl hover:bg-indigo-500 transition-all", theme === 'dark' ? "bg-indigo-600 border-[#0f172a]" : "bg-indigo-600 border-white")}>
                    <Camera className="w-5 h-5" />
                  </button>
                </div>
                <div className="w-full space-y-2">
                  <label className={cn("text-[10px] font-bold uppercase tracking-widest px-1", mutedText)}>Manager Full Name</label>
                  <input type="text" value={tempManagerName} onChange={(e) => setTempManagerName(e.target.value)} className={cn("w-full border rounded-2xl px-5 py-4 font-bold focus:ring-2 focus:ring-indigo-500 outline-none transition-all", inputBgDeep, borderColor, theme === 'dark' ? "text-white" : "text-slate-900")} placeholder="Enter your name" />
                </div>

                <div className={cn("w-full pt-6 border-t space-y-4", borderColor)}>
                  <h4 className={cn("text-[10px] font-black uppercase tracking-widest px-1", mutedText)}>Data Management</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <button onClick={exportData} className={cn("flex items-center justify-center gap-2 py-3.5 rounded-2xl text-xs font-bold transition-all active:scale-95", theme === 'dark' ? "bg-slate-800 hover:bg-slate-700 text-white" : "bg-slate-100 hover:bg-slate-200 text-slate-900")}>
                      <Download className="w-4 h-4" /> Export Backup
                    </button>
                    <button onClick={() => document.getElementById('import-input')?.click()} className={cn("flex items-center justify-center gap-2 py-3.5 rounded-2xl text-xs font-bold transition-all active:scale-95", theme === 'dark' ? "bg-slate-800 hover:bg-slate-700 text-white" : "bg-slate-100 hover:bg-slate-200 text-slate-900")}>
                      <Upload className="w-4 h-4" /> Import Backup
                    </button>
                    <input id="import-input" type="file" accept=".json" onChange={importData} className="hidden" />
                  </div>
                </div>

                <div className="w-full flex gap-3 pt-4">
                  <button onClick={() => setIsProfileModalOpen(false)} className={cn("flex-1 py-4 rounded-2xl font-bold transition-all", theme === 'dark' ? "bg-slate-800 hover:bg-slate-700 text-white" : "bg-slate-100 hover:bg-slate-200 text-slate-900")}>Cancel</button>
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
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 0.9, y: 20 }} 
              className={cn(
                "relative w-full max-w-sm glass-card p-8 rounded-[2.5rem] border shadow-2xl transition-colors duration-500",
                theme === 'dark' ? "bg-[#0f172a] border-rose-500/20" : "bg-white border-rose-200"
              )}
            >
              <div className="flex flex-col items-center text-center gap-6">
                <div className="w-20 h-20 rounded-full bg-rose-500/10 flex items-center justify-center">
                  <Trash2 className="w-10 h-10 text-rose-500" />
                </div>
                <div>
                  <h3 className={cn("text-xl font-black mb-2", headingColor)}>Confirm Delete</h3>
                  <p className={cn("text-sm", mutedText)}>Are you sure you want to remove this transaction? This action cannot be undone.</p>
                </div>
                <div className="w-full flex flex-col gap-3 pt-4">
                  <button onClick={confirmDelete} className="w-full py-4 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-bold transition-all shadow-lg shadow-rose-600/20">Yes, Delete Entry</button>
                  <button onClick={() => setDeleteConfirmId(null)} className={cn("w-full py-4 rounded-2xl font-bold transition-all", theme === 'dark' ? "bg-slate-800 hover:bg-slate-700 text-white" : "bg-slate-100 hover:bg-slate-200 text-slate-900")}>Cancel</button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function NavItem({ icon, label, active = false, onClick, theme = 'dark' }: { icon: React.ReactNode, label: string, active?: boolean, onClick?: () => void, theme?: 'dark' | 'light' }) {
  return (
    <button 
      onClick={onClick} 
      className={cn(
        "w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all", 
        active 
          ? "bg-indigo-600/10 text-indigo-400 border border-indigo-500/20" 
          : cn(
              "text-slate-500",
              theme === 'dark' ? "hover:text-slate-300 hover:bg-white/[0.02]" : "hover:text-slate-900 hover:bg-slate-100"
            )
      )}
    >
      {icon}
      {label}
    </button>
  );
}

function StatCard({ label, value, unit, icon, color, theme = 'dark' }: { label: string, value: string, unit: string, icon: React.ReactNode, color: 'blue' | 'rose' | 'emerald' | 'amber', theme?: 'dark' | 'light' }) {
  const colors = {
    blue: { border: "border-l-blue-500", bg: "from-blue-500/20 to-transparent", icon: "text-blue-400", glow: "group-hover:shadow-blue-500/20", shadow: "shadow-blue-900/20" },
    rose: { border: "border-l-rose-500", bg: "from-rose-500/20 to-transparent", icon: "text-rose-400", glow: "group-hover:shadow-rose-500/20", shadow: "shadow-rose-900/20" },
    emerald: { border: "border-l-emerald-500", bg: "from-emerald-500/20 to-transparent", icon: "text-emerald-400", glow: "group-hover:shadow-emerald-500/20", shadow: "shadow-emerald-900/20" },
    amber: { border: "border-l-amber-500", bg: "from-amber-500/20 to-transparent", icon: "text-amber-400", glow: "group-hover:shadow-amber-500/20", shadow: "shadow-amber-900/20" },
  };
  
  return (
    <motion.div 
      whileHover={{ y: -8, scale: 1.02 }}
      transition={{ type: "spring", stiffness: 400, damping: 10 }}
      className={cn(
        "glass-card p-5 md:p-7 rounded-[2rem] border-l-4 transition-all duration-500 group relative overflow-hidden shadow-2xl", 
        colors[color].border, 
        colors[color].glow,
        colors[color].shadow,
        theme === 'dark' ? "bg-slate-900/80 backdrop-blur-xl border-white/5" : "bg-white shadow-xl border-slate-200"
      )}
    >
      {/* 3D Inner Glow Effect */}
      <div className={cn("absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-700", colors[color].bg)} />
      <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/5 rounded-full blur-3xl group-hover:bg-white/10 transition-all duration-700" />
      
      <div className="relative z-10">
        <div className="flex justify-between items-start mb-4 md:mb-6">
          <div className="space-y-1">
            <p className={cn("text-xs md:text-sm font-black uppercase tracking-[0.2em]", theme === 'dark' ? "text-slate-300" : "text-slate-600")}>
              {label}
            </p>
            <div className={cn("h-1 w-12 rounded-full bg-gradient-to-r from-transparent via-indigo-500 to-transparent opacity-50", colors[color].icon)} />
          </div>
          <div className={cn(
            "p-2.5 md:p-3 rounded-2xl transition-all duration-500 shadow-lg transform group-hover:rotate-12", 
            theme === 'dark' ? "bg-slate-800/50 border border-white/10" : "bg-slate-100 border border-slate-200", 
            colors[color].icon
          )}>
            {icon}
          </div>
        </div>
        
        <div className="flex items-baseline gap-2">
          <h3 className={cn(
            "text-2xl md:text-4xl font-black tracking-tighter drop-shadow-sm", 
            theme === 'dark' ? "text-white" : "text-slate-900"
          )}>
            {value}
          </h3>
          <span className={cn(
            "text-[10px] md:text-sm font-black uppercase tracking-widest", 
            theme === 'dark' ? "text-slate-500" : "text-slate-400"
          )}>
            {unit}
          </span>
        </div>
        
        {/* Bottom Decorative Line */}
        <div className={cn(
          "mt-4 h-[1px] w-full bg-gradient-to-r from-transparent via-white/5 to-transparent",
          theme === 'dark' ? "via-white/5" : "via-slate-200"
        )} />
      </div>
    </motion.div>
  );
}
