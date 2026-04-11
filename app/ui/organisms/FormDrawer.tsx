
import React from 'react';
import Drawer from '../molecules/Drawer';
import Button from '../atoms/Button';
import Input from '../atoms/Input';
import Select from '../molecules/Select';
import Textarea from '../atoms/Textarea';

export interface FormField {
  name: string;
  label: string;
  type: 'text' | 'number' | 'email' | 'select' | 'textarea' | 'date';
  options?: { label: string; value: string }[];
  placeholder?: string;
  required?: boolean;
}

interface FormDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  fields: FormField[];
  onSubmit: (data: any) => void;
  initialData?: any;
}

const FormDrawer: React.FC<FormDrawerProps> = ({ 
  isOpen, 
  onClose, 
  title, 
  fields, 
  onSubmit,
  initialData = {}
}) => {
  const [formData, setFormData] = React.useState(initialData);

  React.useEffect(() => {
    setFormData(initialData);
  }, [initialData, isOpen]);

  const handleChange = (name: string, value: any) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
    onClose();
  };

  return (
    <Drawer open={isOpen} onClose={onClose} title={title}>
      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        {fields.map(field => (
          <div key={field.name} className="space-y-1">
            <label className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-secondary)]">
              {field.label} {field.required && <span className="text-red-500">*</span>}
            </label>
            
            {field.type === 'select' ? (
              <Select 
                options={field.options || []}
                value={formData[field.name] || ''}
                onChange={(val) => handleChange(field.name, val)}
              />
            ) : field.type === 'textarea' ? (
              <Textarea 
                placeholder={field.placeholder}
                value={formData[field.name] || ''}
                onChange={(e) => handleChange(field.name, e.target.value)}
                required={field.required}
              />
            ) : (
              <Input 
                type={field.type}
                placeholder={field.placeholder}
                value={formData[field.name] || ''}
                onChange={(e) => handleChange(field.name, e.target.value)}
                required={field.required}
              />
            )}
          </div>
        ))}

        <div className="pt-6 flex gap-3">
          <Button type="submit" className="flex-1">Save</Button>
          <Button type="button" variant="secondary" onClick={onClose} className="flex-1">Cancel</Button>
        </div>
      </form>
    </Drawer>
  );
};

export default FormDrawer;
