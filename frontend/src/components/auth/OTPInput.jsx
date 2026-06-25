import React, { useState, useRef, useEffect } from 'react';

const OTPInput = ({ length = 6, onComplete }) => {
    const [otp, setOtp] = useState(new Array(length).fill(""));
    const inputRefs = useRef([]);

    useEffect(() => {
        if (inputRefs.current[0]) {
            inputRefs.current[0].focus();
        }
    }, []);

    const handleChange = (index, e) => {
        const value = e.target.value;
        if (isNaN(value)) return;

        const newOtp = [...otp];
        newOtp[index] = value.substring(value.length - 1); // Take only the last typed character
        setOtp(newOtp);

        // Notify parent if complete
        const combinedOtp = newOtp.join("");
        if (combinedOtp.length === length) {
            onComplete(combinedOtp);
        } else {
            onComplete(""); // Reset if not complete
        }

        // Move to next input if current field is filled
        if (value && index < length - 1 && inputRefs.current[index + 1]) {
            inputRefs.current[index + 1].focus();
        }
    };

    const handleKeyDown = (index, e) => {
        // Move to previous input on backspace if current field is empty
        if (e.key === "Backspace" && !otp[index] && index > 0 && inputRefs.current[index - 1]) {
            inputRefs.current[index - 1].focus();
        }
    };

    const handlePaste = (e) => {
        e.preventDefault();
        const pastedData = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);
        if (!pastedData) return;

        const newOtp = [...otp];
        for (let i = 0; i < pastedData.length; i++) {
            newOtp[i] = pastedData[i];
        }
        setOtp(newOtp);

        const combinedOtp = newOtp.join("");
        if (combinedOtp.length === length) {
            onComplete(combinedOtp);
        } else {
            onComplete("");
        }

        // Focus the appropriate input after paste
        const focusIndex = Math.min(pastedData.length, length - 1);
        if (inputRefs.current[focusIndex]) {
            inputRefs.current[focusIndex].focus();
        }
    };

    return (
        <div className="flex justify-between gap-2" onPaste={handlePaste}>
            {otp.map((data, index) => {
                return (
                    <input
                        key={index}
                        type="text"
                        name="otp"
                        maxLength="1"
                        ref={(ref) => (inputRefs.current[index] = ref)}
                        value={data}
                        onChange={(e) => handleChange(index, e)}
                        onKeyDown={(e) => handleKeyDown(index, e)}
                        className="w-10 h-12 text-center text-lg font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
                    />
                );
            })}
        </div>
    );
};

export default OTPInput;
