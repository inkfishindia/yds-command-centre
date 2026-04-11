
import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Invoice, Expense } from '../types';
import { mockInvoices, mockExpenses } from '../lib/mockData';

interface FinanceContextType {
  invoices: Invoice[];
  expenses: Expense[];
  addInvoice: (inv: Partial<Invoice>) => void;
  addExpense: (exp: Partial<Expense>) => void;
  updateInvoice: (id: string, updates: Partial<Invoice>) => void;
  updateExpense: (id: string, updates: Partial<Expense>) => void;
}

const FinanceContext = createContext<FinanceContextType | undefined>(undefined);

export const FinanceProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [invoices, setInvoices] = useState<Invoice[]>(mockInvoices);
  const [expenses, setExpenses] = useState<Expense[]>(mockExpenses);

  const addInvoice = (inv: Partial<Invoice>) => {
    const newInv: Invoice = {
      id: `INV-${Math.floor(Math.random() * 10000)}`,
      customerName: inv.customerName || '',
      amount: inv.amount || 0,
      status: inv.status || 'Draft',
      dueDate: inv.dueDate || new Date().toISOString(),
      ...inv
    } as Invoice;
    setInvoices(prev => [newInv, ...prev]);
  };

  const addExpense = (exp: Partial<Expense>) => {
    const newExp: Expense = {
      id: Math.random().toString(36).substr(2, 9),
      date: exp.date || new Date().toISOString(),
      category: exp.category || 'General',
      vendor: exp.vendor || '',
      amount: exp.amount || 0,
      status: exp.status || 'Pending',
      submittedBy: exp.submittedBy || 'System',
      ...exp
    } as Expense;
    setExpenses(prev => [newExp, ...prev]);
  };

  const updateInvoice = (id: string, updates: Partial<Invoice>) => {
    setInvoices(prev => prev.map(i => i.id === id ? { ...i, ...updates } : i));
  };

  const updateExpense = (id: string, updates: Partial<Expense>) => {
    setExpenses(prev => prev.map(e => e.id === id ? { ...e, ...updates } : e));
  };

  return (
    <FinanceContext.Provider value={{ invoices, expenses, addInvoice, addExpense, updateInvoice, updateExpense }}>
      {children}
    </FinanceContext.Provider>
  );
};

export const useFinance = () => {
  const context = useContext(FinanceContext);
  if (!context) throw new Error('useFinance must be used within a FinanceProvider');
  return context;
};
