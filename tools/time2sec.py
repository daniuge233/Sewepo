def time2seconds(time_str):
    hours, minutes = map(int, time_str.split(":"))  
    seconds = hours * 3600 + minutes * 60
    return seconds

while True:
    time_str = input() 
    print(f"{time_str} 是一天中的第 {time2seconds(time_str)} 秒。")
