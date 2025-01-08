import React from 'react';
import { motion } from 'framer-motion';
import { RiRobot2Fill } from 'react-icons/ri';

interface ChatStatusProps {
  sending: boolean;
}

export default function ChatStatus({ sending }: ChatStatusProps) {
  if (!sending) return null;

  return (
    <div className="flex items-center justify-start p-6">
      <div className="flex items-center space-x-3 bg-white rounded-2xl shadow-sm px-6 py-4">
        <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center shadow-sm">
          <RiRobot2Fill className="w-6 h-6 text-white" />
        </div>
        <div className="flex items-center space-x-3">
          <motion.div className="flex space-x-1.5">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="w-2.5 h-2.5 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"
                animate={{
                  scale: [1, 1.2, 1],
                  opacity: [0.5, 1, 0.5]
                }}
                transition={{
                  duration: 1,
                  repeat: Infinity,
                  delay: i * 0.2
                }}
              />
            ))}
          </motion.div>
          <span className="text-sm text-gray-600 font-medium">AI思考中...</span>
        </div>
      </div>
    </div>
  );
} 