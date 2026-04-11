
import React from 'react';

interface AvatarGroupProps {
  users: { name: string; avatar?: string }[];
  max?: number;
  size?: 'sm' | 'md';
}

const AvatarGroup: React.FC<AvatarGroupProps> = ({ users, max = 3, size = 'sm' }) => {
  const displayUsers = users.slice(0, max);
  const remaining = users.length - max;
  
  const sizeClass = size === 'sm' ? 'w-6 h-6 text-[10px]' : 'w-8 h-8 text-xs';

  return (
    <div className="flex -space-x-2 overflow-hidden">
      {displayUsers.map((user, i) => (
        <div 
          key={i}
          className={`${sizeClass} rounded-full border-2 border-[var(--color-bg-surface)] bg-[var(--color-bg-stage)] flex items-center justify-center font-bold text-[var(--color-text-primary)] uppercase`}
          title={user.name}
        >
          {user.avatar ? (
            <img src={user.avatar} alt={user.name} className="w-full h-full rounded-full object-cover" referrerPolicy="no-referrer" />
          ) : (
            user.name.charAt(0)
          )}
        </div>
      ))}
      {remaining > 0 && (
        <div className={`${sizeClass} rounded-full border-2 border-[var(--color-bg-surface)] bg-[var(--color-bg-stage)] flex items-center justify-center font-bold text-[var(--color-text-secondary)]`}>
          +{remaining}
        </div>
      )}
    </div>
  );
};

export default AvatarGroup;
