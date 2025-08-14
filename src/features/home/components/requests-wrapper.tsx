import React from 'react';
import type { RequestFilters } from '../types/request';
import { RequestsTable } from './requests-table';

interface RequestsWrapperProps {
  filters: RequestFilters;
  onRefresh: () => void;
  keyValue: string;
}

const RequestsWrapper: React.FC<RequestsWrapperProps> = ({ filters, onRefresh, keyValue }) => {
  return (
      <div key={keyValue} className="w-full">
        <RequestsTable
          filters={filters} 
          onRefresh={onRefresh}
        />
      </div>
  );
};

export default RequestsWrapper;

