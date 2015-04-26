
import css from './css'

const {styles: shared, decs: sharedDecs} = css`
checkbox {
  margin-right: 10px
}
head {
  transition: background-color .1s ease
  display: flex
  :hover {
    background-color: #eee
  }
}
children {
  padding: 0 10px
  border-left: 10px solid #ddd
  margin: 0
  margin-left: 10px
  list-style: none
}
`

shared.form = css`
form {
  padding: 7px 10px
}
label {
  cursor: pointer
}
textLabel {
  @label
}
text {
  margin-left: 10px
  padding: 3px 5px
}
submit {
  margin-left: 10px
  cursor: pointer
}
`

export {shared, sharedDecs}

