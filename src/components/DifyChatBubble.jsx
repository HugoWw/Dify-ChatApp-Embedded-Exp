import React, { useState, useRef, useCallback, useEffect } from 'react';
import { FloatButton } from 'antd';
import { MessageOutlined, CloseOutlined } from '@ant-design/icons';
import './DifyChatBubble.css';

const DIFY_CHATBOT_URL = "http://localhost:3000/api/chatbot/xxx";

// Constants for size and position
const MIN_WIDTH = 300;
const MIN_HEIGHT = 400;
const DEFAULT_WIDTH = 384; // 24rem
const DEFAULT_HEIGHT = 700; // 43.75rem
const BUBBLE_SIZE = 56;
const BUBBLE_MARGIN = 20;
const BUBBLE_GAP = 10; // Gap between bubble and chat window

const DifyChatBubble = () => {
  // 定义一个初始化状态值为false的状态，用于控制聊天窗口的显示状态
  const [isOpen, setIsOpen] = useState(false);
  // 定义一个状态，用于控制聊天窗口的大小
  const [size, setSize] = useState({ width: DEFAULT_WIDTH, height: DEFAULT_HEIGHT });

  const getInitialPosition = useCallback(() => {
    const bubbleRight = BUBBLE_MARGIN;
    const bubbleBottom = BUBBLE_MARGIN;
    return {
      x: window.innerWidth - DEFAULT_WIDTH - bubbleRight,
      y: window.innerHeight - DEFAULT_HEIGHT - bubbleBottom - BUBBLE_SIZE - BUBBLE_GAP,
    };
  }, []);

  const [position, setPosition] = useState(getInitialPosition());

  // 聊天窗口的ref容器
  const chatWindowRef = useRef(null);
  // 定义一个容器存放操作类型
  const operation = useRef(null);
  // 定义一个容器存放初始鼠标位置
  const initialMousePos = useRef({ x: 0, y: 0 });
  // 定义一个容器存放初始窗口信息
  const initialWindowInfo = useRef({ width: 0, height: 0, x: 0, y: 0 });
  // 气泡的ref容器
  const bubbleRef = useRef(null);
  // 定义一个容器存放动画帧ID
  const animationFrameId = useRef(null);
  const iframeRef = useRef(null);

  // 监控isOpen状态，如果isOpen为true，则等待iframe加载完成然后注入自己的样式
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const iframe = iframeRef.current;
    if (!iframe) {
      return;
    }

    const handleLoad = () => {
      try {
        const iframeDocument = iframe.contentDocument || iframe.contentWindow.document;

        iframeDocument.title = "";

        if (iframeDocument) {
          const style = iframeDocument.createElement('style');

          style.innerHTML = `
            /*背景颜色*/
            * {
              background-image: linear-gradient(to right, rgb(231 233 238 / 0%), rgb(244 245 246 / 0%)) !important;
            }

            /*用户聊天气泡背景颜色*/
            div.w-full.rounded-2xl.bg-\\[\\#D1E9FF\\]\\/50.px-4.py-3.text-sm.text-gray-900 {
              background-color: rgb(145 154 164) !important;
            }

            /*Header高度*/
            .h-14 {
               height: 2rem !important;
            }
            
            /*移动端头部隐藏title*/
            div.system-md-semibold.truncate{
              font-size: 0px !important;
            }

            /*桌面端隐藏头部信息*/
            div.flex.shrink-0.items-center.gap-1\\.5.px-2{
              visibility: hidden !important;
            }

            /*底部样式*/
            .h-\\[calc\\(100vh_-_60px\\)\\] {
              height: calc(100vh - 20px) !important;
            }
          `;
          
          iframeDocument.head.appendChild(style);
        }
      } catch (error) {
        console.error('DifyChatBubble: Could not inject styles into the iframe.', error);
        console.warn('This is likely due to cross-origin security restrictions. The parent page and the iframe must be on the same domain for this to work.');
      }
    };

    iframe.addEventListener('load', handleLoad);

    return () => {
      iframe.removeEventListener('load', handleLoad);
    };

  }, [isOpen]);

  // 鼠标抬起事件
  const handleMouseUp = useCallback(() => {
    if (animationFrameId.current) {
      cancelAnimationFrame(animationFrameId.current);
      animationFrameId.current = null;
    }
    operation.current = null;
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  }, []);

  const handleMouseMove = useCallback((e) => {
    // 如果操作类型为空，则停止鼠标移动事件的执行
    if (!operation.current) return;

    e.preventDefault();

    if (animationFrameId.current) {
      //在每一次 mousemove 事件开始时，我们会先取消上一次还未执行的 rAF,
      //这是为了防止在鼠标移动过快、事件触发频率高于屏幕刷新率时，
      //rAF 的回调队列中堆积了大量待执行的更新。我们只关心最新的那一次鼠标位置。
      cancelAnimationFrame(animationFrameId.current);
    }


    animationFrameId.current = requestAnimationFrame(() => {
      // 1.计算位移: deltaX 和 deltaY 计算出鼠标从按下那一刻到现在这一刻在水平和垂直方向上移动的距离。
      const deltaX = e.clientX - initialMousePos.current.x;
      const deltaY = e.clientY - initialMousePos.current.y;

      if (operation.current === 'resize') {
        //2.计算新尺寸和新位置:
        //计算新宽度。因为我们是从左上角缩放，鼠标向左移动（deltaX 为负），宽度应该增加，所以用减法。
        let newWidth = initialWindowInfo.current.width - deltaX;
        //同理，鼠标向上移动（deltaY 为负），高度增加。
        let newHeight = initialWindowInfo.current.height - deltaY;
        //同时，窗口的左上角必须跟随鼠标移动，所以新位置是初始位置加上位移。
        let newX = initialWindowInfo.current.x + deltaX;
        let newY = initialWindowInfo.current.y + deltaY;

        //3.应用各种约束(边界检测): 
        //最小尺寸限制: Math.max(MIN_WIDTH, newWidth) 确保窗口不会被缩得太小。
        newWidth = Math.max(MIN_WIDTH, newWidth);
        newHeight = Math.max(MIN_HEIGHT, newHeight);

        //最小尺寸位置修正: 当宽度达到最小值时，newX 需要被重新计算，以保证窗口的右边缘看起来是"钉住"的，
        //只有左边在移动，这更符合用户的直觉。高度同理。
        if (newWidth === MIN_WIDTH) {
          newX = initialWindowInfo.current.x + initialWindowInfo.current.width - MIN_WIDTH;
        }
        if (newHeight === MIN_HEIGHT) {
          newY = initialWindowInfo.current.y + initialWindowInfo.current.height - MIN_HEIGHT;
        }

        //可视区域限制: 确保窗口的四个边都不会超出屏幕的可视范围（并保留了 BUBBLE_MARGIN 的边距）。
        newX = Math.max(BUBBLE_MARGIN, Math.min(newX, window.innerWidth - newWidth - BUBBLE_MARGIN));
        newY = Math.max(BUBBLE_MARGIN, Math.min(newY, window.innerHeight - newHeight - BUBBLE_MARGIN));

        // 气泡按钮防重叠:
        const bubbleRect = {
          left: window.innerWidth - BUBBLE_MARGIN - BUBBLE_SIZE,
          top: window.innerHeight - BUBBLE_MARGIN - BUBBLE_SIZE,
          right: window.innerWidth - BUBBLE_MARGIN,
          bottom: window.innerHeight - BUBBLE_MARGIN,
        };
        const windowRect = { left: newX, top: newY, right: newX + newWidth, bottom: newY + newHeight };

        const isOverlapping = !(
          windowRect.right < bubbleRect.left ||
          windowRect.left > bubbleRect.right ||
          windowRect.bottom < bubbleRect.top ||
          windowRect.top > bubbleRect.bottom
        );

        if (isOverlapping) {
          newY = bubbleRect.top - newHeight - BUBBLE_GAP;
        }
        
        //4.更新状态: 
        // 调用 setSize 和 setPosition，将经过所有计算和约束后的最终结果应用到 
        // React 的 state 中，从而触发组件重新渲染，就能在屏幕上看到窗口大小和位置的变化。
        setSize({ width: newWidth, height: newHeight });
        setPosition({ x: newX, y: newY });
      }
      animationFrameId.current = null;
    });
  }, [handleMouseUp]);

  // 鼠标按下事件  
  const handleMouseDown = (e) => {
    // 判断鼠标是否是左点击，0为左点击，2为右点击，1为滚轮点击
    if (e.button !== 0) return;
    e.preventDefault();
    operation.current = 'resize';
    initialMousePos.current = { x: e.clientX, y: e.clientY };

    if (chatWindowRef.current) {
      const rect = chatWindowRef.current.getBoundingClientRect();
      initialWindowInfo.current = {
        width: rect.width,
        height: rect.height,
        x: rect.left,
        y: rect.top,
      };
    }

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  // 切换聊天窗口的显示状态
  // 如果聊天窗口是关闭的，则打开聊天窗口，并设置聊天窗口的初始位置和窗口位置大小
  const toggleChat = () => {
    if (!isOpen) {
      setSize({ width: DEFAULT_WIDTH, height: DEFAULT_HEIGHT });
      setPosition(getInitialPosition());
    }
    setIsOpen(!isOpen);
  };

  return (
    <div className="chat-bubble-container" ref={bubbleRef}>
      <FloatButton
        icon={isOpen ? <CloseOutlined /> : <MessageOutlined />}
        type="primary"
        onClick={toggleChat}
        style={{ width: BUBBLE_SIZE, height: BUBBLE_SIZE }}
      />
      {isOpen && (
        <div
          ref={chatWindowRef}
          className="chat-window"
          style={{
            width: `${size.width}px`,
            height: `${size.height}px`,
            transform: `translate(${position.x}px, ${position.y}px)`,
            top: 0,
            left: 0,
          }}
        >
          <div
            className="resize-handle top-left"
            onMouseDown={handleMouseDown}
          />
          <div className="chat-window-header">
            <span className="title">Dify Chat</span>
          </div>
          <div className="chat-window-content">
            <iframe
              ref={iframeRef}
              id="dify-chatbot-iframe"
              src={DIFY_CHATBOT_URL}
              title="Dify Chatbot"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default DifyChatBubble; 