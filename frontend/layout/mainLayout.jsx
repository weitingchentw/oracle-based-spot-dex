import Navbar from "../components/navigation/navbar";
import MobilePanel from "../components/MobilePanel";
import React, { useState, useEffect } from 'react';


export default function MainLayout({ children }) {
	const [windowWidth, setWindowWidth] = useState(undefined);

	const handleResize = () => {
		setWindowWidth(window.innerWidth);
	};
  
	useEffect(() => {
        // only execute this code when window is defined
        if (typeof window !== 'undefined') {
            setWindowWidth(window.innerWidth);

            const handleResize = () => {
                setWindowWidth(window.innerWidth);
            };

            window.addEventListener('resize', handleResize);

            // Cleanup on unmount
            return () => {
                window.removeEventListener('resize', handleResize);
            };
        }
    }, []);

    // render nothing until we get the window width
    if (windowWidth === undefined) {
        return null;
    }

	return (
		<>
		{	windowWidth >= 640 
			? 
			<div>
            	<Navbar />
            	{children}
			</div> 
			: 
			<MobilePanel/>
		}
		</>
	);
}
