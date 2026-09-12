interface Props{
  placeholder : string,
  paddingX: string; 
  paddingY: string;
  width: string;

  value: string

  setValue: (value: string) => void

  onchange: (value: string) => void

}


function Input({placeholder, paddingX, paddingY, width, value, setValue, onchange} : Props) {

  return (
    
    <input type="text" placeholder={placeholder} value={value} onChange={(e) => {
      setValue(e.target.value)
      
      onchange(e.target.value)
    }}

        className={`${paddingX} ${paddingY} ${width} bg-slate-700 rounded-lg text-white outline-none`}/>

  ) 

}

export default Input