import * as React from "react";
import Svg, { Circle, Path } from "react-native-svg";

export default function YuloBike({ size = 24, color = "currentColor", strokeWidth = 2, ...props }) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      {/* Left wheel */}
      <Circle cx="6" cy="16.5" r="3.5" />
      <Circle cx="6" cy="16.5" r="1" fill={color} stroke="none" />
      
      {/* Right wheel */}
      <Circle cx="18" cy="16.5" r="3.5" />
      <Circle cx="18" cy="16.5" r="1" fill={color} stroke="none" />
      
      {/* Frame & Handlebars */}
      <Path d="M6 16.5 L9.5 5.5 L12.5 5.5" />
      
      {/* Seat and rear strut */}
      <Path d="M8.2 9.5 L13.5 9.5 L18 16.5" />
    </Svg>
  );
}
