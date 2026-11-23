import * as React from 'react';
import { Button, type ButtonProps } from './Button';

export interface LoadingButtonProps extends Omit<ButtonProps, 'loading'> {
  loading: boolean;
  loadingText?: string;
}

const LoadingButton = React.forwardRef<HTMLButtonElement, LoadingButtonProps>(
  ({ loading, loadingText, children, ...props }, ref) => {
    return (
      <Button
        ref={ref}
        loading={loading}
        {...props}
      >
        {loading && loadingText ? loadingText : children}
      </Button>
    );
  }
);
LoadingButton.displayName = 'LoadingButton';

export { LoadingButton };
