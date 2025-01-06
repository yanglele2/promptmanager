import requests
import json
import codecs
from typing import Optional, Dict, Any

def chat(self, query: str, conversation_id: str = "", user: str = "default_user", 
         inputs: Dict[str, Any] = None) -> None:
    """发送聊天消息并处理流式响应"""
    endpoint = f"{self.base_url}/chat-messages"
    
    payload = {
        "query": query,
        "response_mode": "streaming",
        "conversation_id": conversation_id,
        "user": user,
        "inputs": inputs or {}
    }
        
    try:
        print(f"\n请求 URL: {endpoint}")
        print(f"请求头: {json.dumps(self.headers, indent=2)}")
        print(f"请求体: {json.dumps(payload, indent=2, ensure_ascii=False)}")
        
        # 发送请求并获取流式响应
        response = requests.post(
            endpoint,
            headers=self.headers,
            json=payload,
            stream=True,
            timeout=60  # 添加超时设置
        )
        
        # 检查响应状态
        if response.status_code != 200:
            print(f"错误状态码: {response.status_code}")
            print(f"错误响应: {response.text}")
            return
            
        # 使用文本解码器处理流式响应
        decoder = codecs.getincrementaldecoder('utf-8')()
        buffer = ''
        
        for chunk in response.iter_lines():
            if chunk:
                # 解码当前块
                text = decoder.decode(chunk)
                
                # 处理SSE格式
                if text.startswith('data: '):
                    try:
                        data = json.loads(text[6:])  # 去掉 "data: " 前缀
                        event_type = data.get("event")
                        
                        if event_type == "message" or event_type == "agent_message":
                            answer = data.get("answer", "")
                            if answer:
                                print(answer, end="", flush=True)
                                
                        elif event_type == "message_end":
                            print("\n\n=== 消息结束 ===")
                            if "metadata" in data:
                                print("\n元数据:", json.dumps(data["metadata"], 
                                      ensure_ascii=False, indent=2))
                                
                        elif event_type == "error":
                            error_msg = data.get("message", "未知错误")
                            print(f"\n错误: {error_msg}")
                            break
                            
                    except json.JSONDecodeError as e:
                        print(f"\n解析错误: {str(e)}")
                        print(f"原始数据: {text}")
                        
    except requests.exceptions.RequestException as e:
        print(f"\n请求错误: {str(e)}")
        if hasattr(e, 'response') and e.response is not None:
            print(f"错误响应: {e.response.text}")
    except Exception as e:
        print(f"\n未知错误: {str(e)}") 

def main():
    # 配置信息
    API_KEY = "app-s06za01kxMU2qNRtFpuNYZGV"  # 替换为你的 API Key
    USER_ID = "test_user_001"
    
    try:
        # 创建客户端实例
        client = DifyClient(API_KEY)
        
        # 测试对话
        test_message = "生成一个写小红书笔记文案的提示词"
        print(f"\n发送消息: {test_message}")
        
        # 发送消息并处理响应
        client.chat(
            query=test_message,
            user=USER_ID
        )
        
    except Exception as e:
        print(f"程序执行错误: {str(e)}")

if __name__ == "__main__":
    main() 