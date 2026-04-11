
import React, { useState, useMemo } from 'react';
import Table from '../molecules/Table';
import Checkbox from '../atoms/Checkbox';

interface DataTableProps {
  columns: { 
    header: string; 
    accessor: string | ((row: any) => React.ReactNode);
    sortable?: boolean;
    key?: string;
  }[];
  data: any[];
  onRowClick?: (row: any) => void;
  selectable?: boolean;
  onSelectionChange?: (selectedRows: any[]) => void;
}

const DataTable: React.FC<DataTableProps> = ({ 
  columns, 
  data, 
  onRowClick, 
  selectable,
  onSelectionChange 
}) => {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [selectedIds, setSelectedIds] = useState<Set<string | number>>(new Set());

  const sortedData = useMemo(() => {
    if (!sortKey) return data;
    
    return [...data].sort((a, b) => {
      const aVal = typeof sortKey === 'string' ? a[sortKey] : '';
      const bVal = typeof sortKey === 'string' ? b[sortKey] : '';
      
      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [data, sortKey, sortOrder]);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortOrder('asc');
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === data.length) {
      setSelectedIds(new Set());
      onSelectionChange?.([]);
    } else {
      const newSelection = new Set(data.map((r, i) => r.id || i));
      setSelectedIds(newSelection);
      onSelectionChange?.(data);
    }
  };

  const toggleSelectRow = (row: any, index: number) => {
    const id = row.id || index;
    const newSelection = new Set(selectedIds);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    setSelectedIds(newSelection);
    onSelectionChange?.(data.filter((r, i) => newSelection.has(r.id || i)));
  };

  const tableColumns = useMemo(() => {
    const cols = columns.map(col => ({
      header: col.header,
      accessor: (row: any) => {
        if (typeof col.accessor === 'function') return col.accessor(row);
        return row[col.accessor];
      }
    }));

    if (selectable) {
      cols.unshift({
        header: '',
        accessor: (row: any) => (
          <Checkbox 
            checked={selectedIds.has(row.id || data.indexOf(row))}
            onChange={() => toggleSelectRow(row, data.indexOf(row))}
          />
        )
      });
    }

    return cols;
  }, [columns, selectable, selectedIds, data]);

  return (
    <Table 
      data={sortedData} 
      columns={tableColumns} 
      onRowClick={onRowClick}
    />
  );
};

export default DataTable;
