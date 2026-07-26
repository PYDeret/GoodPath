import {useEffect, useRef, useState} from "react";
import {useAddressSuggestions} from "../../hooks/geo/useAddressSuggestions.ts";

type Props = {
    placeholder: string,
    value: string,
    onChange: (value: string) => void,
}

/**
 * Text input with a BAN address-suggestion dropdown. Suggestions open on
 * focus/typing and close on selection, Escape, or a click outside the
 * component.
 */
function AddressInput({placeholder, value, onChange}: Props) {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const {data: suggestions} = useAddressSuggestions(value);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelect = (label: string) => {
        onChange(label);
        setIsOpen(false);
    };

    return (
        <div className="address-input" ref={containerRef}>
            <input
                type="text"
                placeholder={placeholder}
                value={value}
                onChange={e => {
                    onChange(e.target.value);
                    setIsOpen(true);
                }}
                onFocus={() => setIsOpen(true)}
                onKeyDown={e => {
                    if (e.key === 'Escape') {
                        setIsOpen(false);
                    }
                }}
            />
            {isOpen && suggestions && suggestions.length > 0 && (
                <ul className="address-input-suggestions">
                    {suggestions.map(suggestion => (
                        <li
                            key={suggestion.label}
                            className="address-input-suggestion"
                            onClick={() => handleSelect(suggestion.label)}
                        >
                            {suggestion.label}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

export default AddressInput;
