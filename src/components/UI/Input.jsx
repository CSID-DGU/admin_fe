const Input = ({
  label,
  error,
  help,
  required = false,
  className = "",
  icon: IconComponent,
  ...props
}) => {
  const inputClasses = `
    block w-full px-3 py-2 border text-sm
    focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500
    disabled:bg-gray-50 disabled:text-gray-500
    ${IconComponent ? "pl-10" : ""}
    ${
      error
        ? "border-red-300 text-red-900 placeholder-red-300 focus:ring-red-500 focus:border-red-500"
        : "border-gray-300 text-gray-900 placeholder-gray-400"
    }
    ${className}
  `;

  return (
    <div className="space-y-1">
      {label && (
        <label className="block text-sm font-medium text-gray-700">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}

      <div className="relative">
        {IconComponent && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <IconComponent className="h-5 w-5 text-gray-400" />
          </div>
        )}
        <input className={inputClasses} {...props} />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {help && !error && <p className="text-sm text-gray-500">{help}</p>}
    </div>
  );
};

export default Input;
